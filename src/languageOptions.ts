export interface LanguageOption {
  locale_code: string;
  ttsProvider?: string;
  voice?: string;
  transcriptionProvider?: string;
  speechModel?: string;
}

// Note: Language options are now configured via environment variables in config.ts
// This file maintains the interface and can be used for reference or fallback values
export const languageOptions: { [key: string]: LanguageOption } = {
  spanish: {
    locale_code: "es-US",
    ttsProvider: "google",
    voice: "es-US-Journey-F", //"Lucia-Generative", // "", //"Lucia-Generative", ///"es-US-Journey-F",
    transcriptionProvider: "google",
    speechModel: "telephony",
  },
  english: {
    locale_code: "en-US",
    ttsProvider: "ElevenLabs",
    voice: "g6xIsTj2HwM6VR4iXFCw",
    transcriptionProvider: "Deepgram",
    speechModel: "nova-3-general",
  },
};

// Other examples of language options:
//   'hi-IN': 'hi-IN-Wavenet-A',
//   'fr-FR': 'fr-FR-Journey-F',
//   'cmn-CN': 'cmn-CN-Wavenet-A',
