import { ConversationRelayHelper } from "../helpers/conversationRelayHelper";
import { getCustomerContext } from "./outboundCallController";

/**
 * Handles the webhook when the AI agent leg answers (conference participant)
 * This is called when a conference participant (added via participants.create) answers
 * Returns TwiML with ConversationRelay to connect the AI agent
 *
 * Handles both:
 * - Inbound conference calls (customer called in, AI joins conference)
 * - Outbound conference calls (we called customer, AI joins conference)
 *
 * The AI agent audio will flow through this call leg into the conference
 */
export async function handleOutboundLegAnswer(callData?: any): Promise<string> {
  console.log(
    "AI agent leg answered - connecting to ConversationRelay"
  );

  // Check if this is an outbound conference call
  // Outbound conferences use the pattern "outbound-{callSid}"
  const conferenceName = callData?.FriendlyName || callData?.ConferenceSid;

  if (conferenceName && conferenceName.startsWith('outbound-')) {
    console.log(`Detected outbound conference: ${conferenceName}`);

    // Try to get customer context for outbound call
    const customerContext = getCustomerContext(`conference:${conferenceName}`);

    if (customerContext?.welcomeGreeting) {
      console.log('Using outbound greeting from context');
      return ConversationRelayHelper.createConversationRelayResponse(
        undefined,
        { welcomeGreeting: customerContext.welcomeGreeting }
      );
    }
  }

  // Default: inbound conference or no specific context
  console.log('Using default inbound greeting');
  return ConversationRelayHelper.createDefaultConversationRelayResponse();
}
