import { createEmbeddingService } from "../src/services/embedding/embeddingService";
import { EmbeddingFactory } from "../src/services/embedding/embeddingProviders";

// Test basic instantiation with different providers
describe("Embedding Provider Abstraction", () => {
  beforeAll(() => {
    // Set required environment variables for testing
    process.env.TWILIO_ACCOUNT_SID = "test_account_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
    process.env.TWILIO_WORKFLOW_SID = "test_workflow_sid";
    process.env.OPENAI_API_KEY = "test_openai_key";
    process.env.HUGGINGFACEHUB_API_TOKEN = "test_hf_token";
  });

  test("should create embedding service with OpenAI provider by default", () => {
    expect(() => {
      createEmbeddingService();
    }).not.toThrow();
  });

  test("should create embedding service with explicit OpenAI configuration", () => {
    expect(() => {
      createEmbeddingService({
        provider: "openai",
        modelName: "text-embedding-ada-002",
        batchSize: 256,
      });
    }).not.toThrow();
  });

  test("should create embedding service with HuggingFace configuration", () => {
    // This test verifies the error handling when the package isn't installed
    expect(() => {
      createEmbeddingService({
        provider: "huggingface",
        modelName: "sentence-transformers/all-MiniLM-L6-v2",
      });
    }).toThrow("@langchain/community package is not installed");
  });

  test("should fallback to OpenAI when using Anthropic provider", () => {
    // Anthropic doesn't have native embeddings, so should fallback to OpenAI
    expect(() => {
      createEmbeddingService({
        provider: "anthropic",
      });
    }).not.toThrow();
  });

  test("should throw error with unsupported provider", () => {
    expect(() => {
      EmbeddingFactory.createEmbedding({
        provider: "unsupported" as any,
      });
    }).toThrow("Unsupported embedding provider: unsupported");
  });

  test("should return supported providers list", () => {
    const providers = EmbeddingFactory.getSupportedProviders();
    expect(providers).toContain("openai");
    expect(providers).toContain("huggingface");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("custom");
  });
});
