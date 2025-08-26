import dotenv from "dotenv";
import { z } from "zod";
import { languageOptions } from "./languageOptions";

// Load environment variables
dotenv.config();

// Create a schema for validation
const configSchema = z.object({
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: z.string().min(1, "Twilio Account SID is required"),
  TWILIO_AUTH_TOKEN: z.string().min(1, "Twilio Auth Token is required"),
  TWILIO_WORKFLOW_SID: z.string().min(1, "Twilio Workflow SID is required"),

  // Ngrok Configuration
  NGROK_DOMAIN: z.string().optional(),

  // Conversation Relay Welcome Greeting
  WELCOME_GREETING: z.string().optional(),

  // Speech Service Configuration
  SPEECH_KEY: z.string().optional(),
  SPEECH_REGION: z.string().optional(),

  // LLM Configuration
  LLM_PROVIDER: z
    .enum(["openai", "anthropic", "custom"])
    .optional()
    .default("openai"),
  LLM_MODEL_NAME: z.string().optional(),
  LLM_TEMPERATURE: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  LLM_MAX_TOKENS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  LLM_STREAMING: z
    .string()
    .optional()
    .transform((val) => (val ? val.toLowerCase() === "true" : undefined)),

  // Embedding Configuration
  EMBEDDING_PROVIDER: z
    .enum(["openai", "anthropic", "huggingface", "custom"])
    .optional()
    .default("openai"),
  EMBEDDING_MODEL_NAME: z.string().optional(),
  EMBEDDING_BATCH_SIZE: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  EMBEDDING_DIMENSIONS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),

  // API Keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  HUGGINGFACEHUB_API_TOKEN: z.string().optional(),

  // Optional: Server Port
  PORT: z.string().optional().default("3000"),
});

// Validate and parse the environment variables
let parsedConfig: z.infer<typeof configSchema>;

try {
  parsedConfig = configSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Configuration Error:", error.errors);
    throw new Error("Invalid configuration. Please check your .env file.");
  }
  throw error;
}

// Create a config object with typed access
export const config = {
  twilio: {
    accountSid: parsedConfig.TWILIO_ACCOUNT_SID,
    authToken: parsedConfig.TWILIO_AUTH_TOKEN,
    workflowSid: parsedConfig.TWILIO_WORKFLOW_SID,
    welcomeGreeting: parsedConfig.WELCOME_GREETING,
  },
  ngrok: {
    domain: parsedConfig.NGROK_DOMAIN,
  },
  speech: {
    key: parsedConfig.SPEECH_KEY,
    region: parsedConfig.SPEECH_REGION,
  },
  llm: {
    provider: parsedConfig.LLM_PROVIDER,
    modelName: parsedConfig.LLM_MODEL_NAME,
    temperature: parsedConfig.LLM_TEMPERATURE,
    maxTokens: parsedConfig.LLM_MAX_TOKENS,
    streaming: parsedConfig.LLM_STREAMING,
  },
  embedding: {
    provider: parsedConfig.EMBEDDING_PROVIDER,
    modelName: parsedConfig.EMBEDDING_MODEL_NAME,
    batchSize: parsedConfig.EMBEDDING_BATCH_SIZE,
    dimensions: parsedConfig.EMBEDDING_DIMENSIONS,
  },
  openai: {
    apiKey: parsedConfig.OPENAI_API_KEY,
  },
  anthropic: {
    apiKey: parsedConfig.ANTHROPIC_API_KEY,
  },
  huggingface: {
    apiToken: parsedConfig.HUGGINGFACEHUB_API_TOKEN,
  },
  server: {
    port: parseInt(parsedConfig.PORT || "3000", 10),
  },
  languages: languageOptions,
};

// Utility function to mask sensitive information
export function maskSensitiveConfig(config: typeof parsedConfig) {
  return {
    ...config,
    TWILIO_AUTH_TOKEN: config.TWILIO_AUTH_TOKEN.slice(0, 3) + "****",
    OPENAI_API_KEY: config.OPENAI_API_KEY
      ? config.OPENAI_API_KEY.slice(0, 5) + "****"
      : undefined,
    ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY
      ? config.ANTHROPIC_API_KEY.slice(0, 5) + "****"
      : undefined,
    HUGGINGFACEHUB_API_TOKEN: config.HUGGINGFACEHUB_API_TOKEN
      ? config.HUGGINGFACEHUB_API_TOKEN.slice(0, 5) + "****"
      : undefined,
  };
}

// Optional: Log masked configuration for debugging
if (process.env.NODE_ENV !== "production") {
  console.log("Loaded Configuration:", maskSensitiveConfig(parsedConfig));
}
