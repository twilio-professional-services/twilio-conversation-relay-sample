import { CallDetails } from "../types";
import { config } from "../config";
import { twiml } from "twilio";

const VoiceResponse = twiml.VoiceResponse;

export async function handleIncomingCall(
  callData: CallDetails
): Promise<string> {
  // Validate and process incoming call
  if (!callData) {
    throw new Error("Invalid call data");
  }

  console.log("Incoming call data:", callData);

  // Refer the ConversationRelay docs for a complete list of attributes - https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#conversationrelay-attributes
  const response = new VoiceResponse();
  const connect = response.connect({
    action: `https://${config.ngrok.domain}/api/action`,
  });

  const conversationRelay = connect.conversationRelay({
    url: `wss://${config.ngrok.domain}`,
    dtmfDetection: true,
    interruptByDtmf: false,
    welcomeGreeting: config.twilio.welcomeGreeting,
  });

  conversationRelay.language({
    code: "es-US",
    ttsProvider: "ElevenLabs",
    voice: "h415g7h7bSwQrn1qw4ar",
  });

  conversationRelay.language({
    code: "en-US",
    ttsProvider: "ElevenLabs",
    voice: "g6xIsTj2HwM6VR4iXFCw",
  });

  return response.toString();
}
