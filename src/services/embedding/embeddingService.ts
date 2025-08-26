import { Embeddings } from "@langchain/core/embeddings";
import { EmbeddingFactory, EmbeddingConfig } from "./embeddingProviders";
import { config } from "../../config";

export function createEmbeddingService(
  embeddingConfig?: Partial<EmbeddingConfig>
): Embeddings {
  // Create embedding configuration with fallbacks
  const finalConfig: EmbeddingConfig = {
    provider:
      embeddingConfig?.provider || config.embedding.provider || "openai",
    modelName:
      embeddingConfig?.modelName ||
      config.embedding.modelName ||
      getDefaultModelName(
        embeddingConfig?.provider || config.embedding.provider || "openai"
      ),
    batchSize: embeddingConfig?.batchSize ?? config.embedding.batchSize,
    dimensions: embeddingConfig?.dimensions ?? config.embedding.dimensions,
    apiKey:
      embeddingConfig?.apiKey ||
      getApiKeyForProvider(
        embeddingConfig?.provider || config.embedding.provider || "openai"
      ),
  };

  try {
    return EmbeddingFactory.createEmbedding(finalConfig);
  } catch (error) {
    console.error("Failed to initialize embedding service:", error);
    throw error;
  }
}

function getDefaultModelName(provider: string): string {
  switch (provider) {
    case "openai":
      return "text-embedding-ada-002";
    case "huggingface":
      return "sentence-transformers/all-MiniLM-L6-v2";
    case "anthropic":
      return "text-embedding-ada-002"; // fallback to OpenAI since Anthropic doesn't have a dedicated model
    default:
      return "text-embedding-ada-002"; // fallback to OpenAI
  }
}

function getApiKeyForProvider(provider: string): string | undefined {
  switch (provider) {
    case "openai":
    case "anthropic": // Anthropic falls back to OpenAI for embeddings
      return config.openai.apiKey;
    case "huggingface":
      return config.huggingface.apiToken;
    default:
      return undefined;
  }
}
