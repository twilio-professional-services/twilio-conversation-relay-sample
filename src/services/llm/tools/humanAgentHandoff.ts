import { z } from "zod";
import { tool } from "@langchain/core/tools";

interface HumanAgentHandoffParams {
  reason: string;
  context: string;
  summary: string;
  userInfo?: {
    firstName: string;
    lastName: string;
    DOB: string; // Format: YYYY-MM-DD
  };
}

async function humanAgentHandoff(
  params: HumanAgentHandoffParams
): Promise<string> {
  return `The call has been handed off to a human agent. Reason: ${params.reason}. Context: ${params.context}`;
}

const humanAgentHandoffSchema = z.object({
  reason: z.string().min(2).max(100),
  context: z.string().min(2).max(500),
  summary: z.string().min(2).max(500),
  userInfo: z
    .object({
      firstName: z.string().min(2).max(100),
      lastName: z.string().min(2).max(100),
      DOB: z.string().min(10).max(10),
    })
    .optional(),
}) as any;

export const humanAgentHandoffTool = tool(
  async ({ reason, context, summary, userInfo }: HumanAgentHandoffParams) => {
    return await humanAgentHandoff({ reason, context, summary, userInfo });
  },
  {
    name: "human_agent_handoff",
    description: "Hand off the conversation to a human agent.",
    schema: humanAgentHandoffSchema,
  }
);
