import { Embeddings } from "@langchain/core/embeddings";

export interface EmbeddingConfig {
  provider: "openai" | "anthropic" | "huggingface" | "custom";
  modelName?: string;
  apiKey?: string;
  maxRetries?: number;
  batchSize?: number;
  dimensions?: number;
  // Additional provider-specific options
  [key: string]: any;
}

export interface EmbeddingProvider {
  createEmbedding(config: EmbeddingConfig): Embeddings;
  validateConfig(config: EmbeddingConfig): void;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  validateConfig(config: EmbeddingConfig): void {
    if (!config.apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error(
        "OpenAI API key is required for embeddings. Set OPENAI_API_KEY environment variable or provide apiKey in config."
      );
    }
  }

  createEmbedding(config: EmbeddingConfig): Embeddings {
    this.validateConfig(config);

    // Dynamically import OpenAIEmbeddings to avoid hard dependency
    try {
      const { OpenAIEmbeddings } = require("@langchain/openai");

      return new OpenAIEmbeddings({
        modelName: config.modelName || "text-embedding-ada-002",
        openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
        batchSize: config.batchSize || 512,
        maxRetries: config.maxRetries || 6,
        dimensions: config.dimensions,
      });
    } catch (error) {
      throw new Error(
        "@langchain/openai package is not installed. Install it with: npm install @langchain/openai"
      );
    }
  }
}

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  validateConfig(config: EmbeddingConfig): void {
    if (!config.apiKey && !process.env.HUGGINGFACEHUB_API_TOKEN) {
      throw new Error(
        "HuggingFace API token is required for embeddings. Set HUGGINGFACEHUB_API_TOKEN environment variable or provide apiKey in config."
      );
    }
  }

  createEmbedding(config: EmbeddingConfig): Embeddings {
    this.validateConfig(config);

    // Dynamically import HuggingFaceInferenceEmbeddings to avoid hard dependency
    try {
      const {
        HuggingFaceInferenceEmbeddings,
      } = require("@langchain/community/embeddings/hf");

      return new HuggingFaceInferenceEmbeddings({
        model: config.modelName || "sentence-transformers/all-MiniLM-L6-v2",
        apiKey: config.apiKey || process.env.HUGGINGFACEHUB_API_TOKEN,
        maxRetries: config.maxRetries || 5,
      });
    } catch (error) {
      throw new Error(
        "@langchain/community package is not installed. Install it with: npm install @langchain/community"
      );
    }
  }
}

export class AnthropicEmbeddingProvider implements EmbeddingProvider {
  validateConfig(config: EmbeddingConfig): void {
    // Note: Anthropic doesn't have native embeddings, so we'll use a proxy or fallback to OpenAI
    console.warn(
      "Anthropic doesn't provide native embeddings. Consider using OpenAI or HuggingFace for embeddings."
    );
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OpenAI API key is required as fallback for embeddings when using Anthropic LLM. Set OPENAI_API_KEY environment variable."
      );
    }
  }

  createEmbedding(config: EmbeddingConfig): Embeddings {
    this.validateConfig(config);

    // Fallback to OpenAI embeddings since Anthropic doesn't provide embeddings
    try {
      const { OpenAIEmbeddings } = require("@langchain/openai");

      return new OpenAIEmbeddings({
        modelName: config.modelName || "text-embedding-ada-002",
        openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
        batchSize: config.batchSize || 512,
        maxRetries: config.maxRetries || 6,
      });
    } catch (error) {
      throw new Error(
        "@langchain/openai package is not installed. Install it with: npm install @langchain/openai"
      );
    }
  }
}

export class CustomEmbeddingProvider implements EmbeddingProvider {
  validateConfig(config: EmbeddingConfig): void {
    if (!config.embedding) {
      throw new Error(
        "Custom provider requires an 'embedding' property in config with a pre-configured Embeddings instance."
      );
    }
  }

  createEmbedding(config: EmbeddingConfig): Embeddings {
    this.validateConfig(config);
    return config.embedding as Embeddings;
  }
}

export class EmbeddingFactory {
  private static providers: Map<string, EmbeddingProvider> = new Map([
    ["openai", new OpenAIEmbeddingProvider()],
    ["anthropic", new AnthropicEmbeddingProvider()],
    ["huggingface", new HuggingFaceEmbeddingProvider()],
    ["custom", new CustomEmbeddingProvider()],
  ]);

  public static registerProvider(
    name: string,
    provider: EmbeddingProvider
  ): void {
    this.providers.set(name, provider);
  }

  public static createEmbedding(config: EmbeddingConfig): Embeddings {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(
        `Unsupported embedding provider: ${
          config.provider
        }. Available providers: ${Array.from(this.providers.keys()).join(", ")}`
      );
    }

    return provider.createEmbedding(config);
  }

  public static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
