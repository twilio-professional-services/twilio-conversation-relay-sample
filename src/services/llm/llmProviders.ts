import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface LLMConfig {
  provider: "openai" | "anthropic" | "custom";
  modelName?: string;
  apiKey?: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
  // Additional provider-specific options
  [key: string]: any;
}

export interface LLMProvider {
  createModel(config: LLMConfig): BaseChatModel;
  validateConfig(config: LLMConfig): void;
}

export class OpenAIProvider implements LLMProvider {
  validateConfig(config: LLMConfig): void {
    if (!config.apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable or provide apiKey in config."
      );
    }
  }

  createModel(config: LLMConfig): BaseChatModel {
    this.validateConfig(config);

    // Dynamically import ChatOpenAI to avoid hard dependency
    try {
      const { ChatOpenAI } = require("@langchain/openai");

      return new ChatOpenAI({
        modelName: config.modelName || "gpt-3.5-turbo",
        openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
        streaming: config.streaming !== false, // default to true
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    } catch (error) {
      throw new Error(
        "@langchain/openai package is not installed. Install it with: npm install @langchain/openai"
      );
    }
  }
}

export class AnthropicProvider implements LLMProvider {
  validateConfig(config: LLMConfig): void {
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or provide apiKey in config."
      );
    }
  }

  createModel(config: LLMConfig): BaseChatModel {
    this.validateConfig(config);

    // Dynamically import ChatAnthropic to avoid hard dependency
    try {
      const { ChatAnthropic } = require("@langchain/anthropic");

      return new ChatAnthropic({
        model: config.modelName || "claude-3-sonnet-20240229",
        anthropicApiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
        streaming: config.streaming !== false, // default to true
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    } catch (error) {
      throw new Error(
        "@langchain/anthropic package is not installed. Install it with: npm install @langchain/anthropic"
      );
    }
  }
}

export class CustomProvider implements LLMProvider {
  validateConfig(config: LLMConfig): void {
    if (!config.model) {
      throw new Error(
        "Custom provider requires a 'model' property in config with a pre-configured BaseChatModel instance."
      );
    }
  }

  createModel(config: LLMConfig): BaseChatModel {
    this.validateConfig(config);
    return config.model as BaseChatModel;
  }
}

export class LLMFactory {
  private static providers: Map<string, LLMProvider> = new Map([
    ["openai", new OpenAIProvider()],
    ["anthropic", new AnthropicProvider()],
    ["custom", new CustomProvider()],
  ]);

  public static registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  public static createLLM(config: LLMConfig): BaseChatModel {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(
        `Unsupported LLM provider: ${
          config.provider
        }. Available providers: ${Array.from(this.providers.keys()).join(", ")}`
      );
    }

    return provider.createModel(config);
  }

  public static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
