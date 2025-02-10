export interface LanguageOption {
  locale_code: string;
  ttsProvider?: string;
  voice?: string;
  transcriptionProvider?: string;
  speechModel?: string;
}

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
    ttsProvider: "google",
    voice: "en-US-Journey-O",
    transcriptionProvider: "google",
    speechModel: "telephony",
  },
};

// Other examples of language options:
//   'hi-IN': 'hi-IN-Wavenet-A',
//   'fr-FR': 'fr-FR-Journey-F',
//   'cmn-CN': 'cmn-CN-Wavenet-A',
