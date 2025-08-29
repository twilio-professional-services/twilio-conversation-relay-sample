import mockData from "../../../data/mock-data";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

export interface CheckPendingBillParams {
  userId: string;
}

export async function checkPendingBillImplementation(
  params: CheckPendingBillParams
): Promise<string> {
  const bill = mockData.bills.find((bill) => bill.userId === params.userId);

  if (!bill) {
    return "No pending bill found.";
  }

  // for some models a reminder may be necessary to normalize the text
  // const result = `Here is pending bill information I found. Note: don't forgot to normalize the text. ${JSON.stringify(
  //   { userId: params.userId, bill }
  // )}`;

  const result = `${JSON.stringify({ userId: params.userId, bill })}`;

  console.log(result);
  return result;
}

// @ts-ignore
export const checkPendingBillTool = tool(
  async ({ userId }: { userId: string }) => {
    return await checkPendingBillImplementation({ userId });
  },
  {
    name: "check_pending_bill",
    description:
      "Check if a user has any pending bills. Returns the pending bill information if found, or a message indicating no pending bill exists.",
    schema: z.object({
      userId: z
        .string()
        .describe(
          "The unique identifier of the user to check for pending bills"
        ),
    }),
  }
);
