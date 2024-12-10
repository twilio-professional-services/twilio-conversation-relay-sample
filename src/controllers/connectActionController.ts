import * as dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

export async function handleConnectAction(actionPayload: any) {

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const workflowSid = process.env.TWILIO_WORKFLOW_SID;

  // Validate environment variables
  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials in environment variables');
  }

  if (!workflowSid) {
    throw new Error('Missing Twilio workflow SID in environment variables');
  }

  // Initialize Twilio client
  const client = twilio(accountSid, authToken);

  try {

  if (actionPayload.CallStatus === "completed") {
    console.log("Call completed");
    return;
  }
  // Update the call with new TwiML
  await client.calls(actionPayload.CallSid).update({
    twiml: `<Response><Enqueue workflowSid="${workflowSid}"></Enqueue></Response>`
  });

  return;

  } catch (error) {
    throw error;
  }
}

// interface Call {
//   call_sid: string;
// }

// async function transferCall(call: Call): Promise<string> {
//   console.log(`Transferring call ${call.call_sid}`);

//   // Get Twilio credentials from environment variables
//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;

//   // Validate environment variables
//   if (!accountSid || !authToken) {
//     throw new Error('Missing Twilio credentials in environment variables');
//   }

//   // Initialize Twilio client
//   const client = twilio(accountSid, authToken);

//   try {
//     // Update the call with new TwiML
//     await client.calls(call.call_sid).update({
//       twiml: `<Response><Dial>${process.env.TRANSFER_NUMBER}</Dial></Response>`
//     });

//     return 'The call was transferred successfully, say goodbye to the customer.';
//   } catch (error) {
//     if (error instanceof TwilioRestException) {
//       return 'The call was not transferred successfully, advise customer to call back later.';
//     }
//     throw error;
//   }
// }

// export default transferCall;
