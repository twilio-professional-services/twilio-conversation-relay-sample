export interface HumanAgentHandoffParams {
  reason: string;
  context: string;
  summary: string;
  userInfo?: {
    firstName: string;
    lastName: string;
    DOB: string; // Format: YYYY-MM-DD
  };
}

export async function humanAgentHandoff(params: HumanAgentHandoffParams): Promise<string> {

  return `The call has been handed off to a human agent. Reason: ${params.reason}. Context: ${params.context}`;
}