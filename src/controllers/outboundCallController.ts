import twilio from "twilio";
import { config } from "../config";

export interface OutboundCallRequest {
  to: string;
  from?: string;
  client_name: string;
  first_name: string;
  date: string;
  start_time: string;
  end_time: string;
  occupation: string;
}

export async function initiateOutboundCall(
  request: OutboundCallRequest,
): Promise<{ callSid: string; status: string }> {
  const { to, from, client_name, first_name, date, start_time, end_time, occupation } = request;

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

  const escapeXml = (str: string) => str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect action="https://${config.ngrok.domain}/api/action"><ConversationRelay url="wss://${config.ngrok.domain}" dtmfDetection="true" interruptByDtmf="false"><Parameter name="call_direction" value="outbound" /><Parameter name="client_name" value="${escapeXml(client_name)}" /><Parameter name="first_name" value="${escapeXml(first_name)}" /><Parameter name="date" value="${escapeXml(date)}" /><Parameter name="start_time" value="${escapeXml(start_time)}" /><Parameter name="end_time" value="${escapeXml(end_time)}" /><Parameter name="occupation" value="${escapeXml(occupation)}" /><Language code="es-US" ttsProvider="ElevenLabs" voice="h415g7h7bSwQrn1qw4ar" /><Language code="en-US" ttsProvider="ElevenLabs" voice="g6xIsTj2HwM6VR4iXFCw" /></ConversationRelay></Connect></Response>`;

  try {
    const call = await client.calls.create({
      to,
      from: fromNumber,
      twiml,
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
