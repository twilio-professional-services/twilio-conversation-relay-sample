import dotenv from 'dotenv';
import { z } from 'zod';
import { languageOptions } from "./languageOptions";

// Load environment variables
dotenv.config();

// Create a schema for validation
const configSchema = z.object({
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: z.string().min(1, "Twilio Account SID is required"),
  TWILIO_AUTH_TOKEN: z.string().min(1, "Twilio Auth Token is required"),
  TWILIO_WORKFLOW_SID: z.string().min(1, "Twilio Workflow SID is required"),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Ngrok Configuration
  NGROK_DOMAIN: z.string().optional(),

  // Conversation Relay Welcome Greeting
  WELCOME_GREETING: z.string().optional(),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),

  // Anthropic Configuration
  ANTHROPIC_API_KEY: z.string().optional(),

  // Google AI Configuration
  GOOGLE_API_KEY: z.string().optional(),

  // Azure OpenAI Configuration
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_INSTANCE_NAME: z.string().optional(),
  AZURE_OPENAI_API_DEPLOYMENT_NAME: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().optional(),

  // LLM Provider Configuration
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'google', 'azure-openai']).optional().default('openai'),
  LLM_MODEL_NAME: z.string().optional(),

  // Optional: Server Port
  PORT: z.string().optional().default('3000')
});

// Validate and parse the environment variables
let parsedConfig: { TWILIO_ACCOUNT_SID: string; TWILIO_AUTH_TOKEN: string; TWILIO_WORKFLOW_SID: string; TWILIO_PHONE_NUMBER?: string | undefined; WELCOME_GREETING?: string | undefined; PORT: string; NGROK_DOMAIN?: string | undefined; SPEECH_KEY?: string | undefined; SPEECH_REGION?: string | undefined; OPENAI_API_KEY?: string | undefined; ANTHROPIC_API_KEY?: string | undefined; GOOGLE_API_KEY?: string | undefined; LLM_PROVIDER: "openai" | "anthropic" | "google"; LLM_MODEL_NAME?: string | undefined; };

try {
  parsedConfig = configSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Configuration Error:', error.errors);
    throw new Error('Invalid configuration. Please check your .env file.');
  }
  throw error;
}

// Create a config object with typed access
export const config = {
  twilio: {
    accountSid: parsedConfig.TWILIO_ACCOUNT_SID,
    authToken: parsedConfig.TWILIO_AUTH_TOKEN,
    workflowSid: parsedConfig.TWILIO_WORKFLOW_SID,
    phoneNumber: parsedConfig.TWILIO_PHONE_NUMBER,
    welcomeGreeting: parsedConfig.WELCOME_GREETING
  },
  ngrok: {
    domain: parsedConfig.NGROK_DOMAIN
  },
  openai: {
    apiKey: parsedConfig.OPENAI_API_KEY
  },
  anthropic: {
    apiKey: parsedConfig.ANTHROPIC_API_KEY
  },
  google: {
    apiKey: parsedConfig.GOOGLE_API_KEY
  },
  azureOpenAI: {
    apiKey: parsedConfig.AZURE_OPENAI_API_KEY,
    instanceName: parsedConfig.AZURE_OPENAI_API_INSTANCE_NAME,
    deploymentName: parsedConfig.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    apiVersion: parsedConfig.AZURE_OPENAI_API_VERSION
  },
  llm: {
    provider: parsedConfig.LLM_PROVIDER,
    modelName: parsedConfig.LLM_MODEL_NAME
  },
  server: {
    port: parseInt(parsedConfig.PORT || '3000', 10)
  },
  languages: languageOptions,
};

// Utility function to mask sensitive information
export function maskSensitiveConfig(config: typeof parsedConfig) {
  return {
    ...config,
    TWILIO_AUTH_TOKEN: config.TWILIO_AUTH_TOKEN.slice(0, 3) + '****',
    OPENAI_API_KEY: config.OPENAI_API_KEY ? config.OPENAI_API_KEY.slice(0, 5) + '****' : undefined,
    ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY ? config.ANTHROPIC_API_KEY.slice(0, 5) + '****' : undefined,
    GOOGLE_API_KEY: config.GOOGLE_API_KEY ? config.GOOGLE_API_KEY.slice(0, 5) + '****' : undefined,
    AZURE_OPENAI_API_KEY: config.AZURE_OPENAI_API_KEY ? config.AZURE_OPENAI_API_KEY.slice(0, 5) + '****' : undefined,
  };
}

// Optional: Log masked configuration for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log('Loaded Configuration:', maskSensitiveConfig(parsedConfig));
}