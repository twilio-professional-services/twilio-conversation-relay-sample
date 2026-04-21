import { userInfo } from "os";

export interface LLMToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// OpenAI Function Calling https://platform.openai.com/docs/guides/function-calling
export const toolDefinitions: LLMToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "switch_language",
      description: "Switch the language of the conversation",
      parameters: {
        type: "object",
        properties: {
          targetLanguage: {
            type: "string",
            description:
              'The target language to switch to. SHOULD BE ONE OF THE FOLLOWING: ["english","spanish"]',
          },
        },
        required: ["targetLanguage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_shift_bid",
      description:
        "Records the employee's bid on the available shift and generates a confirmation number. Use this when the employee confirms they want to bid on the shift.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "end_call",
      description:
        "Ends the call gracefully. Use this ONLY after the employee has confirmed they have written down their confirmation number, or when the conversation is naturally complete.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description:
              "Brief reason for ending the call, such as 'shift bid confirmed', 'employee declined', or 'conversation complete'.",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "human_agent_handoff",
      description:
        "Transfers the caller to a live scheduling agent. Use this when the caller needs specific shift details, wants to speak to someone, or has questions beyond explaining why we called.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description:
              "The reason for the handoff, such as 'needs shift details', 'out of scope question', or 'user requested'.",
          },
          context: {
            type: "string",
            description:
              "Brief context about what the caller is asking for.",
          },
          summary: {
            type: "string",
            description:
              "A brief summary of the conversation so far.",
          },
        },
        required: ["reason", "context", "summary"],
      },
    },
  },
];
