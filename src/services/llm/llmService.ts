import OpenAI from "openai";
import { ChatCompletionCreateParams } from "openai/resources/chat/completions";
// import { Stream } from "openai/streaming";
// import {
//   ChatCompletionChunk,
//   ChatCompletionMessage,
// } from "openai/resources/chat/completions";
import { systemPrompt } from "../../prompts/systemPrompt";
import { EventEmitter } from "events";
import {
  verifyUser,
  checkPendingBill,
  searchCommonMedicalTerms,
  humanAgentHandoff,
  toolDefinitions,
  LLMToolDefinition,
  checkHsaAccount,
  checkPaymentOptions,
} from "./tools";

export class LLMService extends EventEmitter {
  private openai: OpenAI;
  private messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  private _userInterrupted: boolean | undefined;

  public get userInterrupted(): boolean | undefined {
    return this._userInterrupted;
  }

  public set userInterrupted(value: boolean | undefined) {
    this._userInterrupted = value;
  }

  constructor(apiKey?: string) {
    super();
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.messages =
      new Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>({
        role: "system",
        content: systemPrompt,
      });
  }

  async chatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools?: LLMToolDefinition[],
    options?: Partial<ChatCompletionCreateParams>
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      // Add incoming messages to the conversation history
      this.messages.push(...messages);

      // Prepare the completion request
      const completion = await this.openai.chat.completions.create({
        model: options?.model || "gpt-4-turbo-preview",
        messages: this.messages,
        tools: tools || toolDefinitions,
        tool_choice: tools ? "auto" : undefined,
        ...options,
      });

      const message = completion.choices[0]?.message;

      // Check if there are tool calls that need to be executed
      if (message?.tool_calls && message.tool_calls.length > 0) {
        // Process tool calls
        const toolCallResults = await Promise.all(
          message.tool_calls.map(async (toolCall) => {
            try {
              const result = await this.executeToolCall(toolCall);
              return {
                tool_call_id: toolCall.id,
                role: "tool" as const,
                content: result,
              };
            } catch (error) {
              console.error(
                `Tool call ${toolCall.function.name} failed:`,
                error
              );
              return {
                tool_call_id: toolCall.id,
                role: "tool" as const,
                content: `Error executing tool: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              };
            }
          })
        );

        // Prepare messages for next completion
        const newMessages = [
          ...this.messages,
          {
            role: "assistant",
            tool_calls: message.tool_calls,
            content: null,
          },
          ...toolCallResults,
        ];

        // Recursive call to continue completion after tool calls
        return this.chatCompletion(newMessages, tools, options);
      }

      // Add the assistant's message to conversation history
      this.messages.push(message);
      console.log("message", message);
      this.emit("chatCompletion:complete", message);
    } catch (error) {
      this.emit("chatCompletion:error", error);
      console.error("LLM Chat Completion Error:", error);
      throw error;
    }
  }

  async streamChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools?: LLMToolDefinition[],
    options?: Partial<ChatCompletionCreateParams>
  ) {
    try {
      this.messages.push(...messages);

      console.log("streamChatCompletion", this.messages);

      const stream = await this.openai.chat.completions.create({
        stream: true,
        model: options?.model || "gpt-3.5-turbo",
        messages: this.messages,
        tools: toolDefinitions, // functions as any,
        tool_choice: tools ? "auto" : undefined,
        ...options,
      });

      const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] =
        [];
      for await (const chunk of stream) {
        let content = chunk.choices[0]?.delta?.content || "";
        let deltas = chunk.choices[0].delta;
        let finishReason = chunk.choices[0].finish_reason;

        console.log("chunk", content, finishReason, deltas);

        if (finishReason === "stop") {
          this.emit("streamChatCompletion:complete", content);
          return;
        } else {
          this.emit("streamChatCompletion:partial", content);
        }

        if (chunk.choices[0].delta.tool_calls) {
          chunk.choices[0].delta.tool_calls.forEach((toolCall) => {
            if (toolCall.id) {
              // New tool call
              toolCalls.push({
                id: toolCall.id,
                type: "function",
                function: {
                  name: toolCall.function?.name || "",
                  arguments: toolCall.function?.arguments || "",
                },
              });
            } else if (toolCalls.length > 0) {
              // Continuing arguments of the last tool call
              const lastToolCall = toolCalls[toolCalls.length - 1];
              lastToolCall.function.arguments +=
                toolCall.function?.arguments || "";
            }
          });
        }

        // Check for stream end or tool call requirement
        if (chunk.choices[0].finish_reason === "tool_calls") {
          // Process tool calls
          const toolCallResults = await Promise.all(
            toolCalls.map(async (toolCall) => {
              try {
                const result = await this.executeToolCall(toolCall);
                return {
                  tool_call_id: toolCall.id,
                  role: "tool" as const,
                  content: result,
                };
              } catch (error) {
                console.error(
                  `Tool call ${toolCall.function.name} failed:`,
                  error
                );
                return {
                  tool_call_id: toolCall.id,
                  role: "tool" as const,
                  content: `Error executing tool: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                };
              }
            })
          );

          // Prepare messages for next completion
          const newMessages = [
            // ...messages,
            ...toolCalls.map((toolCall, index) => ({
              role: "assistant" as const,
              tool_calls: [toolCall],
            })),
            ...toolCallResults,
          ];

          // Recursive call to continue completion after tool calls
          return this.streamChatCompletion(newMessages, tools, options);
        }
      }
    } catch (error) {
      console.error("LLM Stream Chat Completion Error:", error);
      throw error;
    }
  }

  async setup(message: any) {
   // Handle setup message
  }

  async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  ): Promise<string> {
    try {
      const {
        function: { name, arguments: args },
      } = toolCall;

      // update the toolFunction to use the toolDefinitions
      const toolFunction = {
        verify_user_identity: verifyUser,
        check_pending_bill: checkPendingBill,
        search_common_medical_terms: searchCommonMedicalTerms,
        human_agent_handoff: humanAgentHandoff,
        check_hsa_account: checkHsaAccount,
        check_payment_options: checkPaymentOptions,
      }[name];

      if (!toolFunction) {
        throw new Error(`Tool ${name} not implemented`);
      }

      const result = await toolFunction(JSON.parse(args));

      if (name === "human_agent_handoff") {
        this.emit("humanAgentHandoff", JSON.parse(args));
      }

      return result;
    } catch (error) {
      this.emit("toolCall:error", error);
      console.error("Tool Call Error:", error);
      throw error;
    }
  }
}

export default LLMService;
