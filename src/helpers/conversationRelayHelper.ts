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
    languages?: LanguageConfig[],
  ): string {
    const response = new twiml.VoiceResponse();
    const connect = response.connect({
      action: actionUrl || `https://${config.ngrok.domain}/api/action`,
    });

    const conversationRelayConfig: any = {
      url: relayConfig?.url || `wss://${config.ngrok.domain}`,
      dtmfDetection: relayConfig?.dtmfDetection ?? true,
      interruptible: relayConfig?.interruptible || "any",
      language: "en-US",
      transcriptionProvider: "Google",
      speechModel: "telephony",
      // ttsProvider: "google",
      // voice: "fil-PH-Standard-A",
      debug: "speaker-events",
      hints: "yes",
      welcomeGreeting:
        relayConfig?.welcomeGreeting || config.twilio.welcomeGreeting,
    };

    // Only add conversationalIntelligenceService if it's configured
    // const conversationalIntelligenceService =
    //   relayConfig?.conversationalIntelligenceService ||
    //   config.twilio.conversationalIntelligenceService;
    // if (conversationalIntelligenceService) {
    //   conversationRelayConfig.conversationalIntelligenceService =
    //     conversationalIntelligenceService;
    // }

    const conversationRelay = connect.conversationRelay(
      conversationRelayConfig,
    );

    // Add language configurations
    // const languagesToAdd =
    //   languages || ConversationRelayHelper.convertLanguageOptionsToConfig();
    // languagesToAdd.forEach((lang) => {
    //   conversationRelay.language({
    //     code: lang.code,
    //     ttsProvider: lang.ttsProvider,
    //     voice: lang.voice,
    //     transcriptionProvider: "Deepgram", // Default transcription provider
    //     speechModel: "nova-3-general", // Default speech model
    //   });
    // });

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

  /**
   * Creates TwiML that places the incoming call in a conference and dials an outbound leg
   * @param conferenceName - Name for the conference (typically the CallSid)
   * @param outboundTo - Phone number to dial for the AI agent leg (placeholder)
   * @param outboundFrom - Phone number to use as caller ID for outbound leg (placeholder)
   * @param answerUrl - Webhook URL called when the outbound leg answers
   * @returns TwiML response string
   */
  public static createConferenceWithDialResponse(
    conferenceName: string,
    outboundTo: string = "+15555551234", // Placeholder
    outboundFrom: string = "+15555554321", // Placeholder
    answerUrl?: string,
  ): string {
    const response = new twiml.VoiceResponse();

    // Place the incoming call in the conference
    const dial = response.dial();
    dial.conference(
      {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
      },
      conferenceName,
    );

    // Create a second TwiML response for the outbound dial
    // This needs to be initiated via Twilio API separately
    // For now, we'll just return the conference TwiML for the incoming leg
    return response.toString();
  }

  /**
   * Creates TwiML for the outbound leg that joins conference and connects to ConversationRelay
   * @param conferenceName - Name of the conference to join
   * @param relayConfig - Optional configuration for conversation relay
   * @param languages - Optional language configurations
   * @returns TwiML response string
   */
  public static createOutboundLegResponse(
    conferenceName?: string,
    relayConfig?: ConversationRelayConfig,
    languages?: LanguageConfig[],
  ): string {
    // When the outbound leg answers, connect it to ConversationRelay
    return ConversationRelayHelper.createConversationRelayResponse(
      undefined,
      relayConfig,
      languages,
    );
  }
}
