import { z } from "zod";
import { tool } from "@langchain/core/tools";
import mockData from "../../../data/mock-data";

interface CheckHsaAccountParams {
  userId: string;
}

export const checkHsaAccountTool = tool(
  async ({ params }: { params: CheckHsaAccountParams }) => {
    const user = mockData.users.find((user) => user.userId === params.userId);

    if (user?.hsaAccount) {
      return JSON.stringify({
        userId: params.userId,
        hsaAccount: user.hsaAccount,
      });
    } else {
      return "No HSA account found.";
    }
  },
  {
    name: "check_hsa_account",
    description: "Check the balance of a user's Health Savings Account (HSA)",
    schema: z.object({
      userId: z.string().min(2).max(100),
    }) as any,
  }
);
