import { CallDetails } from "../types";
import { ConversationRelayHelper } from "../helpers/conversationRelayHelper";

export async function handleIncomingCall(
  callData: CallDetails
): Promise<string> {
  // Validate and process incoming call
  if (!callData) {
    throw new Error("Invalid call data");
  }

  console.log("Incoming call data:", callData);

  // Create conversation relay response using helper
  return ConversationRelayHelper.createDefaultConversationRelayResponse();
}
