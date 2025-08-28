import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { EventEmitter } from "events";
import { systemPrompt } from "../../prompts/systemPrompt";
import {
  verifyUserTool,
  checkPendingBillTool,
  humanAgentHandoffTool,
  checkHsaAccountTool,
  checkPaymentOptionsTool,
  switchLanguageTool,
  // getCurrentWeatherTool,
  collectPhoneNumberTool,
  searchKnowledgeBaseTool,
} from "./tools";
import { StateManager, LLMServiceState } from "./stateManager";
import { concat } from "@langchain/core/utils/stream";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { LLMFactory, LLMConfig } from "./llmProviders";
import { config } from "../../config";

export class LLMService extends EventEmitter {
  private llm: BaseChatModel;
  private messages: BaseMessage[];
  private _userInterrupted: boolean | undefined;
  private sessionId: string = "";
  private stateManager: StateManager;
  private tools: StructuredTool[];

  public get userInterrupted(): boolean | undefined {
    return this._userInterrupted;
  }

  public set userInterrupted(value: boolean | undefined) {
    this._userInterrupted = value;
  }

  constructor(llmConfig?: Partial<LLMConfig>) {
    super();

    // Create LLM configuration with fallbacks
    const finalConfig: LLMConfig = {
      provider: llmConfig?.provider || config.llm.provider || "openai",
      modelName:
        llmConfig?.modelName ||
        config.llm.modelName ||
        this.getDefaultModelName(
          llmConfig?.provider || config.llm.provider || "openai"
        ),
      temperature: llmConfig?.temperature ?? config.llm.temperature,
      streaming: llmConfig?.streaming ?? config.llm.streaming ?? true,
      maxTokens: llmConfig?.maxTokens ?? config.llm.maxTokens,
      apiKey:
        llmConfig?.apiKey ||
        this.getApiKeyForProvider(
          llmConfig?.provider || config.llm.provider || "openai"
        ),
    };

    // Initialize LLM using the factory
    try {
      this.llm = LLMFactory.createLLM(finalConfig);
    } catch (error) {
      console.error("Failed to initialize LLM:", error);
      throw error;
    }

    this.messages = [new SystemMessage(systemPrompt)];
    this.stateManager = StateManager.getInstance();

    // Initialize tools
    this.tools = [
      verifyUserTool,
      switchLanguageTool,
      humanAgentHandoffTool,
      // getCurrentWeatherTool,
      collectPhoneNumberTool,
      searchKnowledgeBaseTool,
      checkPendingBillTool,
      checkPaymentOptionsTool,
      checkHsaAccountTool,
    ];
  }

  // Method to switch LLM provider
  public setLLM(llm: BaseChatModel): void {
    this.llm = llm;
  }

  // Helper method to get default model name for a provider
  private getDefaultModelName(provider: string): string {
    switch (provider) {
      case "openai":
        return "gpt-3.5-turbo";
      case "anthropic":
        return "claude-3-sonnet-20240229";
      default:
        return "gpt-3.5-turbo";
    }
  }

  // Helper method to get API key for a provider
  private getApiKeyForProvider(provider: string): string | undefined {
    switch (provider) {
      case "openai":
        return config.openai.apiKey;
      case "anthropic":
        return config.anthropic.apiKey;
      default:
        return undefined;
    }
  }

  public saveState(): void {
    if (this.sessionId) {
      const state: LLMServiceState = {
        sessionId: this.sessionId,
        messages: this.messages.map((msg) => this.serializeMessage(msg)),
        userInterrupted: this._userInterrupted,
        timestamp: Date.now(),
      };
      this.stateManager.saveState(this.sessionId, state);
    }
  }

  public restoreState(sessionId: string): boolean {
    const savedState = this.stateManager.restoreState(sessionId);
    if (savedState) {
      this.sessionId = savedState.sessionId;
      this.messages = savedState.messages.map((msg) =>
        this.deserializeMessage(msg)
      );
      this._userInterrupted = savedState.userInterrupted;

      this.messages.push(
        new HumanMessage(
          "[Notice: The connection was disconnected and has now been restored. If the user's last message is unclear or incomplete, please politely ask the user to repeat or clarify their request.]"
        )
      );

      console.log(`State restored for session ${sessionId}`);
      this.chatCompletion([]);
      return true;
    }
    return false;
  }

  public clearState(): void {
    if (this.sessionId) {
      this.stateManager.deleteState(this.sessionId);
    }
  }

  async chatCompletion(
    newMessages: BaseMessage[],
    options?: RunnableConfig
  ): Promise<BaseMessage> {
    try {
      // Add incoming messages to the conversation history
      this.messages.push(...newMessages);

      // Bind tools to the LLM
      if (!this.llm) {
        throw new Error("LLM instance is not defined.");
      }
      // @ts-ignore - LLM is guaranteed to be defined after the check above
      const llmWithTools = this.llm.bindTools(this.tools);

      // Get response from LLM
      const response = await llmWithTools.invoke(this.messages, options);

      // Check if there are tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Add the AI message with tool calls to history

        this.messages.push(response);

        // Execute tool calls
        const toolResults = await Promise.all(
          response.tool_calls.map(async (toolCall) => {
            try {
              const tool = this.tools.find((t) => t.name === toolCall.name);
              if (!tool) {
                throw new Error(`Tool ${toolCall.name} not found`);
              }

              const result = await tool.invoke(toolCall.args);

              // Handle special tool events
              this.handleToolEvents(toolCall.name, toolCall.args);

              return new ToolMessage({
                content: result,
                tool_call_id: toolCall.id!,
              });
            } catch (error) {
              console.error(`Tool call ${toolCall.name} failed:`, error);
              return new ToolMessage({
                content: `Error executing tool: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                tool_call_id: toolCall.id!,
              });
            }
          })
        );

        // Add tool results to messages
        this.messages.push(...toolResults);

        // Recursive call to continue completion after tool calls
        return this.chatCompletion([], options);
      }

      // Add the assistant's message to conversation history
      this.messages.push(response);
      console.log("message", response);
      this.emit("chatCompletion:complete", response);

      return response;
    } catch (error) {
      this.emit("chatCompletion:error", error);
      console.error("LLM Chat Completion Error:", error);
      throw error;
    }
  }

  async streamChatCompletion(
    newMessages: BaseMessage[],
    options?: RunnableConfig
  ): Promise<void> {
    try {
      this.messages.push(...newMessages);

      // Bind tools to the LLM
      if (!this.llm) {
        throw new Error("LLM instance is not defined.");
      }
      // @ts-ignore - LLM is guaranteed to be defined after the check above
      const llmWithTools = this.llm.bindTools(this.tools);
      // .pipe(new StringOutputParser());

      const stream = await llmWithTools.stream(this.messages, options);

      let accumulatedResponse = "";
      let toolCalls: any[] = [];
      let gathered: any = undefined;
      let currentAIMessage: AIMessage | null = null;

      for await (const chunk of stream) {
        // Accumulate chunks to build the complete response
        gathered = gathered !== undefined ? concat(gathered, chunk) : chunk;

        // Extract content if available and emit progress
        let content;

        if (chunk.content) {
          const text =
            typeof chunk.content === "string"
              ? chunk.content
              : chunk.content.map((c: any) => c.text || "").join("");

          accumulatedResponse += text;

          console.log(text);
          this.emit("streamChatCompletion:partial", text);
        }

        // // Keep track of the full message for tool calls
        // if (chunk instanceof AIMessage) {
        //   currentAIMessage = chunk;
        // }

        // Handle tool calls from the chunk
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          toolCalls.push(...chunk.tool_calls);
        }

        // Process tool call chunks if available
        if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
          for (const toolCallChunk of chunk.tool_call_chunks) {
            // Find or create a tool call entry
            let toolCall = toolCalls.find((tc) => tc.id === toolCallChunk.id);
            if (!toolCall) {
              toolCall = {
                id: toolCallChunk.id,
                name: toolCallChunk.name || "",
                args: toolCallChunk.args || "",
              };
              toolCalls.push(toolCall);
            } else {
              // Update existing tool call with new chunks
              if (toolCallChunk.name) toolCall.name = toolCallChunk.name;
              if (toolCallChunk.args)
                toolCall.args = (toolCall.args || "") + toolCallChunk.args;
            }
          }
        }
      }

      // Process the final gathered result
      if (gathered && gathered.tool_calls && gathered.tool_calls.length > 0) {
        // If we have complete tool calls, use them
        toolCalls = gathered.tool_calls;

        // Try to parse args as JSON if they're strings
        toolCalls.forEach((call) => {
          if (typeof call.args === "string") {
            try {
              call.args = JSON.parse(call.args);
            } catch (e) {
              console.warn("Failed to parse tool args as JSON:", call.args);
            }
          }
        });
      }

      // Handle tool calls if any were accumulated
      if (toolCalls.length > 0) {
        const aiMessage = new AIMessage({
          content: accumulatedResponse,
          tool_calls: toolCalls,
        });
        this.messages.push(aiMessage);

        // Execute tool calls
        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall) => {
            try {
              const tool = this.tools.find((t) => t.name === toolCall.name);
              if (!tool) {
                throw new Error(`Tool ${toolCall.name} not found`);
              }

              const result = await tool.invoke(toolCall.args);

              // Handle special tool events
              this.handleToolEvents(toolCall.name, toolCall.args);

              return new ToolMessage({
                content: result,
                tool_call_id: toolCall.id!,
              });
            } catch (error) {
              console.error(`Tool call ${toolCall.name} failed:`, error);
              return new ToolMessage({
                content: `Error executing tool: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                tool_call_id: toolCall.id!,
              });
            }
          })
        );

        this.messages.push(...toolResults);

        // Continue streaming with tool results
        return this.streamChatCompletion([], options);
      } else {
        // No tool calls, just add the final message
        this.messages.push(new AIMessage(accumulatedResponse));
        this.emit("streamChatCompletion:complete", accumulatedResponse);
      }
    } catch (error) {
      console.error("LLM Stream Chat Completion Error:", error);
      throw error;
    }
  }

  async setup(message: any) {
    console.log("Setting up session:", message);

    if (message.callSid) {
      this.sessionId = message.callSid;

      const restored = this.restoreState(message.callSid);
      if (!restored) {
        console.log("No previous state found, initializing new session");
        this.messages = [new SystemMessage(systemPrompt)];
      }
    }
  }

  private handleToolEvents(toolName: string, args: any): void {
    switch (toolName) {
      case "human_agent_handoff":
        this.emit("humanAgentHandoff", args);
        break;
      case "switch_language":
        this.emit("switchLanguage", args);
        break;
      case "collect_phone_number":
        this.emit("dtmfInput", "phoneNumber");
        break;
    }
  }

  private serializeMessage(message: BaseMessage): any {
    return {
      type: message.getType(),
      content: message.content,
      additional_kwargs: message.additional_kwargs,
    };
  }

  private deserializeMessage(serialized: any): BaseMessage {
    switch (serialized.type) {
      case "system":
        return new SystemMessage(serialized.content);
      case "human":
        return new HumanMessage(serialized.content);
      case "ai":
        return new AIMessage(serialized.content);
      case "tool":
        return new ToolMessage({
          content: serialized.content,
          tool_call_id: serialized.tool_call_id,
        });
      default:
        throw new Error(`Unknown message type: ${serialized.type}`);
    }
  }

  // Helper method to add messages in a more convenient way
  public addHumanMessage(content: string): void {
    this.messages.push(new HumanMessage(content));
  }

  public addSystemMessage(content: string): void {
    this.messages.push(new SystemMessage(content));
  }
}

export default LLMService;
