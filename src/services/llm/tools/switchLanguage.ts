import { config } from "../../../config";

export interface switchLanguageParams {
  targetLanguage: string;
}

export async function switchLanguage(
  params: switchLanguageParams,
): Promise<string> {
  console.log("Switch Language", params);

  const normalizedLanguage = params.targetLanguage?.trim().toLowerCase();

  if (normalizedLanguage && normalizedLanguage in config.languages) {
    return `Language switched to ${normalizedLanguage}`;
  }

  return "Language not supported";
}
