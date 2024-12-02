import OpenAI from "openai";
import { ChatCompletionCreateParams } from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import {
  ChatCompletionChunk,
  ChatCompletionMessage,
} from "openai/resources/chat/completions";
import { systemPrompt } from "./systemPrompt";
import { EventEmitter } from "events";

// export interface LLMFunctionDefinition {
//   name: string;
//   description: string;
//   parameters: {
//     type: "object";
//     properties: Record<string, any>;
//     required?: string[];
//   };
// }

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

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
  ) {
    try {
      this.messages.push(...messages);
      const completion = await this.openai.chat.completions.create({
        model: options?.model || "gpt-3.5-turbo",
        messages: this.messages,
        tools: this.getToolDefinitions(),
        tool_choice: tools ? "auto" : undefined,
        ...options,
      });

      const message = completion.choices[0]?.message;
      console.log("message", message);
      this.emit("chatCompletion:complete", message);
    } catch (error) {
      console.error("LLM Chat Completion Error:", error);
      throw error;
    }
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
        model: options?.model || 'gpt-4-turbo-preview',
        messages: this.messages,
        tools: tools || this.getToolDefinitions(),
        tool_choice: tools ? 'auto' : undefined,
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
                role: 'tool' as const,
                content: result,
              };
            } catch (error) {
              console.error(`Tool call ${toolCall.function.name} failed:`, error);
              return {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
              };
            }
          })
        );

        // Prepare messages for next completion
        const newMessages = [
          ...this.messages,
          {
            role: 'assistant',
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
      this.emit('chatCompletion:error', error);
      console.error('LLM Chat Completion Error:', error);
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

      // while(true) {

      this.userInterrupted = false;

      const stream = await this.openai.chat.completions.create({
        stream: true,
        model: options?.model || "gpt-3.5-turbo",
        messages: this.messages,
        tools: this.getToolDefinitions(), // functions as any,
        tool_choice: tools ? "auto" : undefined,
        ...options,
      });


      let message = {} as ChatCompletionMessage;
      const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];
      for await (const chunk of stream) {

        if (this.userInterrupted) {
          this.emit("streamChatCompletion:interrupted");
          break;
        }

        // console.log("Full chunk:", JSON.stringify(chunk, null, 2));


        let content = chunk.choices[0]?.delta?.content || "";
        let deltas = chunk.choices[0].delta;
        let finishReason = chunk.choices[0].finish_reason;

        console.log("chunk", content, finishReason, deltas);

        if(finishReason === "stop") {
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
                type: 'function',
                function: {
                  name: toolCall.function?.name || '',
                  arguments: toolCall.function?.arguments || '',
                },
              });
            } else if (toolCalls.length > 0) {
              // Continuing arguments of the last tool call
              const lastToolCall = toolCalls[toolCalls.length - 1];
              lastToolCall.function.arguments += toolCall.function?.arguments || '';
            }
          });
        }

        // Check for stream end or tool call requirement
        if (chunk.choices[0].finish_reason === 'tool_calls') {
          // Process tool calls
          const toolCallResults = await Promise.all(
            toolCalls.map(async (toolCall) => {
              try {
                const result = await this.executeToolCall(toolCall);
                return {
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  content: result,
                };
              } catch (error) {
                console.error(`Tool call ${toolCall.function.name} failed:`, error);
                return {
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
                };
              }
            })
          );

          // Prepare messages for next completion
          const newMessages = [
            ...messages,
            ...toolCalls.map((toolCall, index) => ({
              role: 'assistant' as const,
              tool_calls: [toolCall],
            })),
            ...toolCallResults,
          ];

          // Recursive call to continue completion after tool calls
          return this.streamChatCompletion(newMessages, tools, options);
        }
      

        // ///************ */

        // // Step 2: check if GPT wanted to call a function
        // if (!deltas.tool_calls) {
        //   // Step 3: Collect the tokens containing function data
        //   message = this.messageReducer(message, chunk);
        //   console.log("chunk message", chunk, finishReason);

        //   if (finishReason) break;
        //   // this.emit('streamChatCompletion:chunk', message);
        // }

        // if (chunk.choices[0]?.finish_reason === "function_call") {
        //   const functionCall = chunk.choices[0].delta.function_call;
        //   const functionResult = await this.executeFunctionCall(functionCall);

        //   this.messages.push({
        //     role: "function",
        //     name: functionCall.name,
        //     content: functionResult,
        //   });

        //   break;
        // } else {
        //   this.messages.push(message);
        //   // this.emit('streamChatCompletion:chunk', chunk);
        //   break;
        // }
        //********** */
      }

      // this.emit('streamChatCompletion:complete');
      // }
    } catch (error) {
      console.error("LLM Stream Chat Completion Error:", error);
      throw error;
    }
  }

  private messageReducer(
    previous: ChatCompletionMessage,
    item: ChatCompletionChunk
  ): ChatCompletionMessage {
    const reduce = (acc: any, delta: any) => {
      acc = { ...acc };
      for (const [key, value] of Object.entries(delta)) {
        if (acc[key] === undefined || acc[key] === null) {
          acc[key] = value;
        } else if (typeof acc[key] === "string" && typeof value === "string") {
          (acc[key] as string) += value;
        } else if (typeof acc[key] === "object" && !Array.isArray(acc[key])) {
          acc[key] = reduce(acc[key], value);
        }
      }
      return acc;
    };

    return reduce(previous, item.choices[0]!.delta) as ChatCompletionMessage;
  }

  async executeToolCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  ): Promise<string> {
    try {
      this.emit('toolCall:start', toolCall);

      const { function: { name, arguments: args } } = toolCall;
      let result: string;

      switch (name) {
        case 'get_current_weather':
          result = await this.getCurrentWeather(JSON.parse(args));
          break;
        case 'book_flight':
          result = await this.bookFlight(JSON.parse(args));
          break;
        default:
          throw new Error(`Tool ${name} not implemented`);
      }

      this.emit('toolCall:complete', { name, result });
      return result;
    } catch (error) {
      this.emit('toolCall:error', error);
      console.error('Tool Call Error:', error);
      throw error;
    }
  }

  private async getCurrentWeather(params: { location: string }): Promise<string> {
    this.emit('tool:getCurrentWeather', params);
    return JSON.stringify({
      location: params.location,
      temperature: '72°F',
      condition: 'Sunny',
    });
  }

  private async bookFlight(params: { 
    destination: string, 
    date: string 
  }): Promise<string> {
    this.emit('tool:bookFlight', params);
    return JSON.stringify({
      bookingConfirmation: 'FLIGHT-' + Math.random().toString(36).substr(2, 9),
      destination: params.destination,
      date: params.date,
      status: 'Confirmed'
    });
  }

  // Example function definitions for demonstration
//   getFunctionDefinitions(): LLMFunctionDefinition[] {
//     return [
//       {
//         name: "get_current_weather",
//         description: "Get the current weather for a specific location",
//         parameters: {
//           type: "object",
//           properties: {
//             location: {
//               type: "string",
//               description: "The city and state, e.g. San Francisco, CA",
//             },
//           },
//           required: ["location"],
//         },
//       },
//       {
//         name: "book_flight",
//         description: "Book a flight to a specific destination",
//         parameters: {
//           type: "object",
//           properties: {
//             destination: {
//               type: "string",
//               description: "The destination city",
//             },
//             date: {
//               type: "string",
//               description: "The date of the flight",
//             },
//           },
//           required: ["destination", "date"],
//         },
//       },
//     ];
//   }
// }

getToolDefinitions(): LLMToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'get_current_weather',
        description: 'Get the current weather for a specific location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA',
            },
          },
          required: ['location'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'book_flight',
        description: 'Book a flight to a specific destination',
        parameters: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              description: 'The destination city',
            },
            date: {
              type: 'string',
              description: 'The date of the flight',
            },
          },
          required: ['destination', 'date'],
        },
      },
    },
  ];
}
}


export default LLMService;
