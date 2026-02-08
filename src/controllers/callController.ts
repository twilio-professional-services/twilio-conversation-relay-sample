import { CallDetails } from "../types";
import { config } from "../config";
import twilio from "twilio";
import { twiml } from "twilio";
import { ConversationRelayHelper } from "../helpers/conversationRelayHelper";

// Initialize Twilio client
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

export async function handleIncomingCall(
  callData: CallDetails,
): Promise<string> {
  // Validate and process incoming call
  if (!callData) {
    throw new Error("Invalid call data");
  }

  console.log("Incoming call data:", callData);

  // If conference mode is disabled, directly return ConversationRelay TwiML
  if (!config.twilio.useConference) {
    console.log("Conference mode disabled - using direct ConversationRelay");
    return ConversationRelayHelper.createDefaultConversationRelayResponse();
  }

  // Conference mode enabled - create conference with AI participant
  const conferenceName = callData.CallSid; // Use CallSid as conference name
  const outboundTo = config.twilio.outboundTo!; // Required when using conference
  const outboundFrom = config.twilio.outboundFrom!; // Required when using conference

  // Create TwiML to place the incoming call into a conference
  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.conference(
    {
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
    },
    conferenceName,
  );

  // Add a participant to the conference
  // The 'to' number should be configured to return ConversationRelay TwiML when it answers
  // This allows the AI agent (via ConversationRelay) to be a participant in the conference
  try {
    const participant = await twilioClient
      .conferences(conferenceName)
      .participants.create({
        to: outboundTo,
        from: outboundFrom,
        earlyMedia: true,
        endConferenceOnExit: false,
      });

    console.log(
      `Conference participant added: ${participant.callSid} to conference: ${conferenceName}`,
    );
  } catch (error) {
    console.error("Failed to add conference participant:", error);
    throw error;
  }

  return response.toString();
}
