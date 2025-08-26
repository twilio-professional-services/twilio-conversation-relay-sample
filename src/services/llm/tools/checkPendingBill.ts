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

  return JSON.stringify({ userId: params.userId, bill });
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
