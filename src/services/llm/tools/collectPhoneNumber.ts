import { z } from "zod";
import { tool } from "@langchain/core/tools";

async function collectPhoneNumber(): Promise<string> {
  return "Please prompt the caller to say or input their phone number";
}

export const collectPhoneNumberTool = tool(
  async () => {
    return await collectPhoneNumber();
  },
  {
    name: "collect_phone_number",
    description: "Collect the user's phone number",
    schema: z.object({}) as any,
  }
);
