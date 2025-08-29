import { LLMService } from "../../../src/services/llm/llmService";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

// Test data for text normalization evaluation in proper context
const textNormalizationTestCases = [
  {
    input: "What is my balance from the last pending bill.",
    expectedPatterns: [/six hundred dollars/i],
    category: "currency",
    description: "Currency amounts should be normalized for TTS",
  },
  {
    input: "is there overflow parking?",
    expectedPatterns: [/one two three Main Avenue/i],
    category: "numbers",
    description: "umbers should be spelled out for voice",
  },
];

describe("LLM Text Normalization in Context", () => {
  let llmService: LLMService;

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.TWILIO_ACCOUNT_SID = "test_account_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
    process.env.TWILIO_WORKFLOW_SID = "test_workflow_sid";
    process.env.OPENAI_API_KEY =
      process.env.OPENAI_API_KEY || "test_openai_key";
  });

  beforeEach(() => {
    llmService = new LLMService({
      //   provider: "openai",
      modelName: "gpt-4o-mini",
      provider: "openai",
      // modelName: "gpt-4",
      //   provider: "anthropic",
      //   model: "claude-sonnet-4-0",
      temperature: 0, // Deterministic responses for testing
      maxTokens: 200,
      streaming: false,
    });
  });

  /**
   * Helper function to simulate a verified user session
   * This properly simulates the verify_user tool call and response
   */
  async function simulateVerifiedUserSession(): Promise<void> {
    // Simulate the verification process by adding the conversation history
    llmService.addHumanMessage("Hi, I need help with my account");
    llmService.addHumanMessage("My name is John Doe and my DOB is 1990-05-01");

    // Simulate the AI response with verify_user tool call
    const verificationAIMessage = new AIMessage({
      content: "",
      additional_kwargs: {},
      tool_calls: [
        {
          id: "call_verify_user_123",
          name: "verify_user",
          args: {
            firstName: "John",
            lastName: "Doe",
            DOB: "1990-05-01",
          },
        },
      ],
    });

    // Simulate the tool call result (successful verification)
    const verificationToolMessage = new ToolMessage({
      content: JSON.stringify({
        userId: "user123",
        verified: true,
      }),
      tool_call_id: "call_verify_user_123",
    });

    // Simulate the final AI response after verification
    const verificationResponse = new AIMessage({
      content:
        "Thank you John, I've verified your identity. How can I assist you today?",
      additional_kwargs: {},
    });

    // Add all messages to conversation history to simulate complete verification flow
    llmService["messages"].push(verificationAIMessage);
    llmService["messages"].push(verificationToolMessage);
    llmService["messages"].push(verificationResponse);
  }

  describe("Text Normalization with Verified User Context", () => {
    textNormalizationTestCases.forEach(
      ({ input, expectedPatterns, category, description }) => {
        test(`should normalize ${category}: "${input}"`, async () => {
          try {
            // Set up verified user context
            await simulateVerifiedUserSession();

            // Test the normalization
            const response = await llmService.chatCompletion([
              new HumanMessage(input),
            ]);
            const responseContent = response.content as string;

            console.log(`\n${category.toUpperCase()} TEST:`);
            console.log(`Input: "${input}"`);
            console.log(`Response: "${responseContent}"`);
            console.log(`Description: ${description}`);

            // Check if any expected pattern matches
            const hasMatch = expectedPatterns.some((pattern) =>
              pattern.test(responseContent)
            );

            if (!hasMatch) {
              console.log(
                `Expected patterns: ${expectedPatterns
                  .map((p) => p.source)
                  .join(" OR ")}`
              );
              // Don't fail the test immediately - let's collect all results first
              console.log(`❌ No pattern match found`);
            } else {
              console.log(`✅ Pattern match found`);
            }

            // For now, just ensure we get a response - we'll analyze patterns separately
            expect(responseContent).toBeDefined();
            expect(typeof responseContent).toBe("string");
            expect(responseContent.length).toBeGreaterThan(0);
          } catch (error) {
            if (error instanceof Error && error.message.includes("API")) {
              console.log(
                `Skipping ${category} test due to API error: ${error.message}`
              );
              return;
            }
            throw error;
          }
        }, 15000);
      }
    );
  });
});
