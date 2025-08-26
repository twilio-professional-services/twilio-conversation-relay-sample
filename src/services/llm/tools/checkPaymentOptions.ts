import { z } from "zod";
import { tool } from "@langchain/core/tools";
import mockData from "../../../data/mock-data";

export interface CheckPaymentOptionsParams {
  userId: string;
  hsaAccountBalance: number;
  balance: number;
}

export const checkPaymentOptionsTool = tool(
  async (params: CheckPaymentOptionsParams) => {
    return checkPaymentOptions(params);
  },
  {
    name: "check_payment_options",
    description: "Check available payment options for a user",
    schema: z.object({
      userId: z.string().min(2).max(100),
      hsaAccountBalance: z.number().min(0),
      balance: z.number().min(0),
    }) as any,
  }
);

async function checkPaymentOptions(
  params: CheckPaymentOptionsParams
): Promise<string> {
  console.log("Check Payment Options Params", params);

  if (params.balance <= params.hsaAccountBalance) {
    return JSON.stringify({
      userId: params.userId,
      paymentOptions: "[HSA Account]",
    });
  } else {
    return JSON.stringify({
      userId: params.userId,
      paymentOptions:
        "[Payment Plan - ask caller if they would like to discus payment plan options. And invoke transfer to human agent if caller wants to learn more ]",
    });
  }
}
