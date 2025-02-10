import { config } from "../../../config";

export interface switchLanguageParams {
  targetLanguage: string;
}

export async function switchLanguage(params: switchLanguageParams): Promise<string> {

  console.log('Switch Language', params);

  if (params.targetLanguage in config.languages) {
    return `Language switched to ${params.targetLanguage}`;
  }
  else {
    return "Language not supported";
  }
}