import { CallDetails } from "../types";
import { config } from "../config";

export async function handleIncomingCall(
  callData: CallDetails
): Promise<string> {
  // Validate and process incoming call
  if (!callData) {
    throw new Error("Invalid call data");
  }

  console.log("Incoming call data:", callData);

  const { AccountSid, FlowSid } = callData;

  // Refer the ConversationRelay docs for a complete list of attributes - https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#conversationrelay-attributes
  return `<Response>
              <Connect action="https://${config.ngrok.domain}/api/action">
                    <ConversationRelay url="wss://${config.ngrok.domain}" dtmfDetection="true" interruptByDtmf="false" welcomeGreeting="${config.twilio.welcomeGreeting}">
                      <Language code="es-US" ttsProvider="ElevenLabs" voice="h415g7h7bSwQrn1qw4ar" />
                      <Language code="en-US" ttsProvider="ElevenLabs" voice="g6xIsTj2HwM6VR4iXFCw" />
                    </ConversationRelay>
              </Connect>
          </Response>`;
}
