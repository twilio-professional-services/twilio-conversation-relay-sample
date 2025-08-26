import { z } from "zod";
import { config } from "../../../config";
import { tool } from "@langchain/core/tools";

export interface switchLanguageParams {
  targetLanguage: string;
}

export async function switchLanguage(
  params: switchLanguageParams
): Promise<string> {
  console.log("Switch Language", params);

  if (params.targetLanguage in config.languages) {
    return `Language switched to ${params.targetLanguage}`;
  } else {
    return "Language not supported";
  }
}

const switchLanguageSchema = z.object({
  targetLanguage: z.string().min(2).max(100),
}) as any;

export const switchLanguageTool = tool(
  async ({ targetLanguage }: { targetLanguage: string }) => {
    return await switchLanguage({ targetLanguage });
  },
  {
    name: "switch_language",
    description:
      "Switch the user's language to the specified target language. Available languages are: english, spanish",
    schema: switchLanguageSchema,
  }
);
