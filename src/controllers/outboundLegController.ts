import { ConversationRelayHelper } from "../helpers/conversationRelayHelper";

/**
 * Handles the webhook when the outbound AI agent leg answers
 * This is called when a conference participant (added via participants.create) answers
 * Returns TwiML with ConversationRelay to connect the AI agent
 * The AI agent audio will flow through this call leg into the conference
 */
export async function handleOutboundLegAnswer(): Promise<string> {
  console.log(
    "Outbound AI agent leg answered - connecting to ConversationRelay"
  );

  // Return ConversationRelay TwiML
  // The audio from the AI agent will flow back through this participant connection into the conference
  return ConversationRelayHelper.createDefaultConversationRelayResponse();
}
