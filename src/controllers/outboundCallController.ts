import twilio, { twiml } from "twilio";
import { config } from "../config";

const VoiceResponse = twiml.VoiceResponse;

export interface OutboundCallRequest {
  to: string;
  from?: string;
  clientName: string;
  firstName: string;
  date: string;
  startTime: string;
  endTime: string;
  occupation: string;
  language: string;
}

export async function initiateOutboundCall(
  request: OutboundCallRequest,
): Promise<{ callSid: string; status: string }> {
  const {
    to,
    from,
    clientName,
    firstName,
    date,
    startTime,
    endTime,
    occupation,
    language,
  } = request;

  console.log("Initiating outbound call with parameters:", request);

  if (!to) {
    throw new Error("Destination phone number (to) is required");
  }

  const client = twilio(config.twilio.accountSid, config.twilio.authToken);

  const fromNumber = from || config.twilio.phoneNumber;

  if (!fromNumber) {
    throw new Error(
      "From phone number is required. Set TWILIO_PHONE_NUMBER in .env or provide in request",
    );
  }

  const response = new VoiceResponse();
  const connect = response.connect({
    action: `https://${config.ngrok.domain}/api/action`,
  });

  const conversationRelay = connect.conversationRelay({
    url: `wss://${config.ngrok.domain}`,
    dtmfDetection: true,
    interruptByDtmf: false,
    language: language ? language : "en-US",
  });

  conversationRelay.parameter({
    name: "call_direction",
    value: "outbound",
  });

  conversationRelay.parameter({
    name: "client_name",
    value: clientName,
  });

  conversationRelay.parameter({
    name: "first_name",
    value: firstName,
  });

  conversationRelay.parameter({
    name: "date",
    value: date,
  });

  conversationRelay.parameter({
    name: "start_time",
    value: startTime,
  });

  conversationRelay.parameter({
    name: "end_time",
    value: endTime,
  });

  conversationRelay.parameter({
    name: "occupation",
    value: occupation,
  });

  conversationRelay.language({
    code: "fr-CA",
    ttsProvider: "ElevenLabs",
    voice: "K7gx0ylJdff0yjM2uVQS",
  });

  conversationRelay.language({
    code: "en-US",
    ttsProvider: "ElevenLabs",
    voice: "g6xIsTj2HwM6VR4iXFCw",
  });

  const twimlString = response.toString();

  try {
    const call = await client.calls.create({
      to,
      from: fromNumber,
      twiml: twimlString,
    });

    return {
      callSid: call.sid,
      status: call.status,
    };
  } catch (error) {
    console.error("Failed to initiate outbound call:", error);
    throw error;
  }
}
