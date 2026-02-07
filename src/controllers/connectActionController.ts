import * as dotenv from "dotenv";
import twilio from "twilio";
import { ConversationRelayHelper } from "../helpers/conversationRelayHelper";

dotenv.config();

export async function handleConnectAction(actionPayload: any) {
  console.log("Call completed", actionPayload);

  // note: this is required for transfer to Twilio taskrouter/flex
  const workflowSid = process.env.TWILIO_WORKFLOW_SID;

  if (!workflowSid) {
    throw new Error("Missing Twilio workflow SID in environment variables");
  }

  try {
    if (
      actionPayload.CallStatus === "in-progress" &&
      actionPayload.ErrorCode === "64105"
    ) {
      console.log("Websocket ended abruptly, likely due to network issues.");

      // restart conversationrelay session
      return ConversationRelayHelper.createDefaultConversationRelayResponse();
    }

    const voiceResponse = new twilio.twiml.VoiceResponse();

    if (!actionPayload.HandoffData) {
      console.log("No HandoffData - Call can be be ended");
      return voiceResponse.hangup().toString();
    }

    console.log("Connect Action Payload", actionPayload);

    return voiceResponse
      .enqueue({ workflowSid: workflowSid })
      .task(actionPayload.HandoffData)
      .toString();
  } catch (error) {
    throw error;
  }
}
