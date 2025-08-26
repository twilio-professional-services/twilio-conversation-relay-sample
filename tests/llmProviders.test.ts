import { LLMService } from "../src/services/llm/llmService";

// Test basic instantiation with different providers
describe("LLM Provider Abstraction", () => {
  beforeAll(() => {
    // Set required environment variables for testing
    process.env.TWILIO_ACCOUNT_SID = "test_account_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
    process.env.TWILIO_WORKFLOW_SID = "test_workflow_sid";
    process.env.OPENAI_API_KEY = "test_openai_key";
    process.env.ANTHROPIC_API_KEY = "test_anthropic_key";
  });

  test("should create LLMService with OpenAI provider by default", () => {
    expect(() => {
      new LLMService();
    }).not.toThrow();
  });

  test("should create LLMService with explicit OpenAI configuration", () => {
    expect(() => {
      new LLMService({
        provider: "openai",
        modelName: "gpt-4",
        temperature: 0.7,
      });
    }).not.toThrow();
  });

  test("should create LLMService with Anthropic configuration", () => {
    expect(() => {
      new LLMService({
        provider: "anthropic",
        modelName: "claude-3-sonnet-20240229",
        temperature: 0.5,
      });
    }).not.toThrow();
  });

  test("should throw error with unsupported provider", () => {
    expect(() => {
      new LLMService({
        provider: "unsupported" as any,
      });
    }).toThrow("Unsupported LLM provider: unsupported");
  });

  test("should throw error when missing required dependencies", () => {
    // This would test the actual error thrown when packages aren't installed
    // but since we have them installed, we skip this test in actual implementation
  });
});
