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

// OpenAI Function Calling https://platform.openai.com/docs/guides/function-calling
export const toolDefinitions : LLMToolDefinition[] = [
    // {
    //   type: 'function',
    //   function: {
    //     name: 'get_current_weather',
    //     description: 'Get the current weather for a specific location',
    //     parameters: {
    //       type: 'object',
    //       properties: {
    //         location: {
    //           type: 'string',
    //           description: 'The city and state, e.g. San Francisco, CA',
    //         },
    //       },
    //       required: ['location'],
    //     },
    //   },
    // },
    {
      type: 'function',
      function: {
        name: 'switch_language',
        description: 'Switch the language of the conversation',
        parameters: {
          type: 'object',
          properties: {
            targetLanguage: {
              type: 'string',
              description: 'The target language to switch to. SHOULD BE ONE OF THE FOLLOWING: ["english","spanish"]',
            },
          },
          required: ['targetLanguage'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'verify_user_identity',
        description: 'Verify the identity of a user',
        parameters: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              description: 'First name of the user',
            },
            lastName: {
              type: 'string',
              description: 'Last name of the user',
            },
            DOB: {
              type: 'string',
              description: 'Date of birth of the user. Format: YYYY-MM-DD',
            },
          },
          required: ['firstName', 'lastName', 'DOB'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'check_pending_bill',
        description: 'Check if the user has a pending medical bill',
        parameters: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID. Note: This is verified user id from the verify_user_identity function',
            },
          },
          required: ['userId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_common_medical_terms',
        description: 'Check knowledge base for medical terms',
        parameters: {
          type: 'object',
          properties: {
            inquiry: {
              type: 'string',
              description: 'The term to search for SHOULD BE ONE OF THE FOLLOWING: ["DEDUCTIBLE","COPAY","HSA","OUT_OF_POCKET_MAX"]',
            },
          },
          required: ['inquiry'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'check_hsa_account',
        description: 'Check the balance of a user\'s Health Savings Account (HSA)',
        parameters: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID. Note: This is verified user id from the verify_user_identity function',
            },
          },
          required: ['userId'],
        },
      },
    },
    // {
    //   type: 'function',
    //   function: {
    //     name: 'check_payment_options',
    //     description: 'Check the payment options available to the user',
    //     parameters: {
    //       type: 'object',
    //       properties: {
    //         userId: {
    //           type: 'string',
    //           description: 'The user ID. Note: This is verified user id from the verify_user_identity function',
    //         },
    //         hsaAccountBalance: {
    //           type: 'number',
    //           description: 'The balance of the user\'s Health Savings Account (HSA). Note: This is verified by the check_hsa_account function',
    //         },
    //         balance: {
    //           type: 'number',
    //           description: 'The total amount of the balance on a pending medical bill. Note: This is verified by the check_pending_bill function',
    //         },
    //       },
    //       required: ['userId', 'hsaAccountBalance', 'balance'],
    //     },
    //   },
    // },
    {
      type: 'function',
      function: {
        name: 'human_agent_handoff',
        description: 'Transfers the customer to a live agent in case they request help from a real person.',
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description:
                "The reason for the handoff, such as user request, legal issue, financial matter, or other sensitive topics.",
            },
            context: {
              type: "string",
              description:
                "Any relevant conversation context or details leading to the handoff.",
            },
          },
          required: ["reason"],
        }
      },
    },
  ];
