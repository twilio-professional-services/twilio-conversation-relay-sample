import dotenv from 'dotenv';
import { z } from 'zod';

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
  
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),
  
  // Optional: Server Port
  PORT: z.string().optional().default('3000')
});

// Validate and parse the environment variables
let parsedConfig: { TWILIO_ACCOUNT_SID: string; TWILIO_AUTH_TOKEN: string; TWILIO_WORKFLOW_SID: string; WELCOME_GREETING?: string | undefined; PORT: string; NGROK_DOMAIN?: string | undefined; SPEECH_KEY?: string | undefined; SPEECH_REGION?: string | undefined; OPENAI_API_KEY?: string | undefined; };

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
    welcomeGreeting: parsedConfig.WELCOME_GREETING
  },
  ngrok: {
    domain: parsedConfig.NGROK_DOMAIN
  },
  speech: {
    key: parsedConfig.SPEECH_KEY,
    region: parsedConfig.SPEECH_REGION
  },
  openai: {
    apiKey: parsedConfig.OPENAI_API_KEY
  },
  server: {
    port: parseInt(parsedConfig.PORT || '3000', 10)
  }
};

// Utility function to mask sensitive information
export function maskSensitiveConfig(config: typeof parsedConfig) {
  return {
    ...config,
    TWILIO_AUTH_TOKEN: config.TWILIO_AUTH_TOKEN.slice(0, 3) + '****',
    OPENAI_API_KEY: config.OPENAI_API_KEY ? config.OPENAI_API_KEY.slice(0, 5) + '****' : undefined
  };
}

// Optional: Log masked configuration for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log('Loaded Configuration:', maskSensitiveConfig(parsedConfig));
}