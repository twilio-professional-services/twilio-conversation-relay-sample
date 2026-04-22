import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { systemPrompt, outboundSystemPrompt } from "../../prompts/systemPrompt";
import { EventEmitter } from "events";
import {
  humanAgentHandoff,
  toolDefinitions,
  LLMToolDefinition,
  switchLanguage,
  confirmShiftBid,
  endCall,
} from "./tools";
import { StateManager, LLMServiceState } from "./stateManager";

type LLMProvider = "openai" | "anthropic" | "google" | "azure-openai";

export class LLMService extends EventEmitter {
  private model: BaseChatModel;
  private messages: BaseMessage[];
  private _userInterrupted: boolean | undefined;
  private sessionId: string = "";
  private stateManager: StateManager;
  private provider: LLMProvider;

  public get userInterrupted(): boolean | undefined {
    return this._userInterrupted;
  }

  public set userInterrupted(value: boolean | undefined) {
    this._userInterrupted = value;
  }

  constructor(provider: LLMProvider = "openai", modelName?: string) {
    super();
    this.provider = provider;
    this.model = this.initializeModel(provider, modelName);
    this.messages = [];
    this.stateManager = StateManager.getInstance();
  }

  private initializeModel(provider: LLMProvider, modelName?: string): BaseChatModel {
    switch (provider) {
      case "anthropic":
        return new ChatAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: modelName || "claude-haiku-4-5-20251001", // Claude 4.5 Haiku - fastest and latest
          temperature: 0.7,
        });
      case "google":
        return new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY,
          model: modelName || "gemini-2.0-flash-001", // Latest stable Gemini Flash model
          temperature: 0.7,
        });
      case "azure-openai":
        return new ChatOpenAI({
          azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
          azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
          azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || modelName,
          azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
          temperature: 0.7,
          streaming: true,
        });
      case "openai":
      default:
        return new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: modelName || "gpt-3.5-turbo", // Fastest OpenAI model for real-time voice
          temperature: 0.7,
          streaming: true,
        });
    }
  }

  public saveState(): void {
    if (this.sessionId) {
      const state: LLMServiceState = {
        sessionId: this.sessionId,
        messages: this.messages as any,
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
      this.messages = savedState.messages as any;
      this._userInterrupted = savedState.userInterrupted;
      this.messages.push(
        new SystemMessage(
          "Notice: The connection was disconnected and has now been restored. If the user's last message is unclear or incomplete, please politely ask the user to repeat or clarify their request."
        )
      );
      console.log(`State restored for session ${sessionId}`);
      this.chatCompletion(this.messages);
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
    messages: BaseMessage[],
    tools?: LLMToolDefinition[]
  ): Promise<BaseMessage> {
    try {
      // Add incoming messages to the conversation history
      this.messages.push(...messages);

      // Bind tools if provided
      const modelWithTools = tools
        ? this.model.bind({ tools: this.convertToolsToLangChain(tools) })
        : this.model;

      // Get completion
      const response = await modelWithTools.invoke(this.messages);

      // Check if there are tool calls
      if (response.additional_kwargs?.tool_calls && response.additional_kwargs.tool_calls.length > 0) {
        // Add AI message with tool calls to history
        this.messages.push(response);

        // Process tool calls
        const toolCallResults = await Promise.all(
          response.additional_kwargs.tool_calls.map(async (toolCall: any) => {
            try {
              const result = await this.executeToolCallLangChain(toolCall);
              return new ToolMessage({
                content: result,
                tool_call_id: toolCall.id,
              });
            } catch (error) {
              console.error(`Tool call ${toolCall.function.name} failed:`, error);
              return new ToolMessage({
                content: `Error executing tool: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                tool_call_id: toolCall.id,
              });
            }
          })
        );

        // Add tool results to messages
        this.messages.push(...toolCallResults);

        // Recursive call to continue completion after tool calls
        return this.chatCompletion([], tools);
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
    messages: BaseMessage[],
    tools?: LLMToolDefinition[]
  ) {
    try {
      this.messages.push(...messages);

      console.log("streamChatCompletion", this.messages);

      // Bind tools if provided
      const modelWithTools = tools
        ? this.model.bind({ tools: this.convertToolsToLangChain(tools) })
        : this.model.bind({ tools: this.convertToolsToLangChain(toolDefinitions) });

      const stream = await modelWithTools.stream(this.messages);

      const toolCalls: any[] = [];
      let llmResponse = "";
      let aiMessageWithTools: AIMessage | null = null;

      for await (const chunk of stream) {
        const content = chunk.content || "";

        if (typeof content === "string") {
          llmResponse += content;
          console.log("chunk", content);
          this.emit("streamChatCompletion:partial", content);
        }

        // Check for tool calls in chunk
        if (chunk.additional_kwargs?.tool_calls) {
          chunk.additional_kwargs.tool_calls.forEach((toolCall: any) => {
            if (toolCall.id) {
              toolCalls.push(toolCall);
            }
          });
        }
      }

      // Check if we have tool calls to process
      if (toolCalls.length > 0) {
        console.log("Tool calls detected:", toolCalls);

        // Create AI message with tool calls
        aiMessageWithTools = new AIMessage({
          content: llmResponse,
          additional_kwargs: { tool_calls: toolCalls },
        });
        this.messages.push(aiMessageWithTools);

        // Process tool calls
        const toolCallResults = await Promise.all(
          toolCalls.map(async (toolCall: any) => {
            try {
              const result = await this.executeToolCallLangChain(toolCall);
              return new ToolMessage({
                content: result,
                tool_call_id: toolCall.id,
              });
            } catch (error) {
              console.error(`Tool call ${toolCall.function.name} failed:`, error);
              return new ToolMessage({
                content: `Error executing tool: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                tool_call_id: toolCall.id,
              });
            }
          })
        );

        // Add tool results to messages
        this.messages.push(...toolCallResults);

        // Recursive call to continue completion after tool calls
        return this.streamChatCompletion([], tools);
      } else {
        // No tool calls, just finish with the response
        this.messages.push(new AIMessage(llmResponse));
        this.emit("streamChatCompletion:complete", llmResponse);
      }
    } catch (error) {
      console.error("LLM Stream Chat Completion Error:", error);
      throw error;
    }
  }

  async setup(message: any) {
    // Handle setup message
    console.log("Setting up session:", message);

    if (message.callSid) {
      this.sessionId = message.callSid;

      // Try to restore previous state for reconnection
      const restored = this.restoreState(message.callSid);
      if (!restored) {
        // Initialize new session if no previous state found
        console.log("No previous state found, initializing new session");

        // Check if this is an outbound call with custom parameters
        const customParams = message.customParameters;
        if (customParams?.call_direction === "outbound") {
          console.log("Outbound call detected with parameters:", customParams);

          // Replace placeholders in the outbound system prompt
          const customizedPrompt = outboundSystemPrompt
            .replace(/\[CLIENT_NAME\]/g, customParams.client_name || "the organization")
            .replace(/\[FIRST_NAME\]/g, customParams.first_name || "there")
            .replace(/\[Date\]/g, customParams.date || "the scheduled date")
            .replace(/\[Start Time\]/g, customParams.start_time || "the start time")
            .replace(/\[End Time\]/g, customParams.end_time || "the end time")
            .replace(/\[Occupation\]/g, customParams.occupation || "the position");

          // Add today's date and shift details as context
          const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          const contextMessage = `CURRENT DATE: ${today}

SHIFT DETAILS FOR THIS CALL:
- Client Name: ${customParams.client_name}
- Employee First Name: ${customParams.first_name}
- Shift Date: ${customParams.date}
- Start Time: ${customParams.start_time}
- End Time: ${customParams.end_time}
- Occupation: ${customParams.occupation}

You must use these exact details when presenting the shift offer.`;

          this.messages = [
            new SystemMessage(customizedPrompt),
            new SystemMessage(contextMessage),
          ];

          // Trigger the initial greeting
          this.streamChatCompletion([
            new HumanMessage("Start the conversation with the initial greeting."),
          ]);
        } else {
          // Inbound call - use default system prompt
          console.log("Inbound call detected");

          const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          this.messages = [
            new SystemMessage(systemPrompt),
            new SystemMessage(`CURRENT DATE: ${today}`),
          ];
        }
      }
    }
  }

  private convertToolsToLangChain(tools: LLMToolDefinition[]) {
    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));
  }

  async executeToolCallLangChain(toolCall: any): Promise<string> {
    try {
      const { name, arguments: args } = toolCall.function;

      const toolFunctionMap: Record<string, (params: any) => Promise<any>> = {
        human_agent_handoff: humanAgentHandoff,
        switch_language: switchLanguage,
        confirm_shift_bid: confirmShiftBid,
        end_call: endCall,
      };

      const toolFunction = toolFunctionMap[name];

      if (!toolFunction) {
        throw new Error(`Tool ${name} not implemented`);
      }

      const parsedArgs = typeof args === "string"
        ? (args.trim() === "" ? {} : JSON.parse(args))
        : (args || {});
      const result = await toolFunction(parsedArgs);

      if (name === "human_agent_handoff") {
        this.emit("humanAgentHandoff", parsedArgs);
      } else if (name === "switch_language") {
        this.emit("switchLanguage", parsedArgs);
      } else if (name === "end_call") {
        this.emit("endCall", parsedArgs);
      }

      return typeof result === "string" ? result : JSON.stringify(result);
    } catch (error) {
      this.emit("toolCall:error", error);
      console.error("Tool Call Error:", error);
      throw error;
    }
  }
}

export default LLMService;
