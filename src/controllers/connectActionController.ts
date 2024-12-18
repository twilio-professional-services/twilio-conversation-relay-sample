import * as dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

export async function handleConnectAction(actionPayload: any) {

  const workflowSid = process.env.TWILIO_WORKFLOW_SID;

  if (!workflowSid) {
    throw new Error('Missing Twilio workflow SID in environment variables');
  }

  try {

  if (actionPayload.CallStatus === "completed") {
    console.log("Call completed");
    return;
  }

  const voiceResponse = new twilio.twiml.VoiceResponse();

  if (!actionPayload.HandoffData) {
    console.log("No HandoffData - Call can be be ended");
    return voiceResponse.hangup().toString();
  }

  console.log('Connect Action Payload', actionPayload);

  return voiceResponse.enqueue({ workflowSid: workflowSid}).task(actionPayload.HandoffData).toString();

  } catch (error) {
    throw error;
  }
}
