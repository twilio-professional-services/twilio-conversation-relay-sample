import { twiml } from "twilio";
import { config } from "../config";
import { LanguageOption } from "../languageOptions";

export interface LanguageConfig {
  code: string;
  ttsProvider: string;
  voice: string;
}

export interface ConversationRelayConfig {
  url?: string;
  dtmfDetection?: boolean;
  conversationalIntelligenceService?: string;
  interruptible?: string;
  welcomeGreeting?: string;
}

export class ConversationRelayHelper {
  /**
   * Converts language options from config to language config format
   */
  private static convertLanguageOptionsToConfig(): LanguageConfig[] {
    return Object.values(config.languages).map((lang: LanguageOption) => ({
      code: lang.locale_code,
      ttsProvider: lang.ttsProvider || "google",
      voice: lang.voice || "",
    }));
  }

  /**
   * Creates a conversation relay response with configured languages
   * @param actionUrl - The action URL for the connect element
   * @param relayConfig - Optional configuration for conversation relay
   * @param languages - Optional language configurations, defaults to predefined languages
   * @returns TwiML response string
   */
  public static createConversationRelayResponse(
    actionUrl?: string,
    relayConfig?: ConversationRelayConfig,
    languages?: LanguageConfig[]
  ): string {
    const response = new twiml.VoiceResponse();
    const connect = response.connect({
      action: actionUrl || `https://${config.ngrok.domain}/api/action`,
    });

    const conversationRelayConfig: any = {
      url: relayConfig?.url || `wss://${config.ngrok.domain}`,
      dtmfDetection: relayConfig?.dtmfDetection ?? true,
      interruptible: relayConfig?.interruptible || "any",
      welcomeGreeting:
        relayConfig?.welcomeGreeting || config.twilio.welcomeGreeting,
    };

    // Only add conversationalIntelligenceService if it's configured
    const conversationalIntelligenceService =
      relayConfig?.conversationalIntelligenceService ||
      config.twilio.conversationalIntelligenceService;
    if (conversationalIntelligenceService) {
      conversationRelayConfig.conversationalIntelligenceService =
        conversationalIntelligenceService;
    }

    const conversationRelay = connect.conversationRelay(
      conversationRelayConfig
    );

    // Add language configurations
    const languagesToAdd =
      languages || ConversationRelayHelper.convertLanguageOptionsToConfig();
    languagesToAdd.forEach((lang) => {
      conversationRelay.language({
        code: lang.code,
        ttsProvider: lang.ttsProvider,
        voice: lang.voice,
      });
    });

    return response.toString();
  }

  /**
   * Creates a conversation relay response with default configuration
   * @returns TwiML response string
   */
  public static createDefaultConversationRelayResponse(): string {
    return ConversationRelayHelper.createConversationRelayResponse();
  }

  /**
   * Gets the language configurations from config
   * @returns Array of language configurations from config
   */
  public static getConfiguredLanguages(): LanguageConfig[] {
    return ConversationRelayHelper.convertLanguageOptionsToConfig();
  }
}
