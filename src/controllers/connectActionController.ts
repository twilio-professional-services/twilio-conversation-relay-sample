import * as dotenv from "dotenv";
import twilio from "twilio";
import { config } from "../config";

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

      return `<Response>
                    <Connect action="https://${config.ngrok.domain}/api/action">
                          <ConversationRelay url="wss://${config.ngrok.domain}" dtmfDetection="true" interruptByDtmf="false" >
                            <Language code="es-US" ttsProvider="ElevenLabs" voice="h415g7h7bSwQrn1qw4ar" />
                            <Language code="en-US" ttsProvider="ElevenLabs" voice="g6xIsTj2HwM6VR4iXFCw" />
                          </ConversationRelay>
                    </Connect>
                </Response>`;
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
