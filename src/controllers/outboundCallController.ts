/**
 * Outbound Call Controller
 * Handles outbound calling with AMD (Answering Machine Detection)
 */

import twilio from "twilio";
import { twiml } from "twilio";
import { config } from "../config";
import {
  OutboundCallRequest,
  AMDStatusUpdate,
  CustomerContext,
} from "../types";
import { ConversationRelayHelper } from "../helpers/conversationRelayHelper";

// In-memory storage for customer context
const customerContextStore = new Map<string, CustomerContext>();

/**
 * Store customer context with auto-cleanup after 1 hour
 * @param callSid Call identifier
 * @param context Customer context data
 */
export function storeCustomerContext(
  callSid: string,
  context: CustomerContext,
): void {
  customerContextStore.set(callSid, context);
  setTimeout(() => customerContextStore.delete(callSid), 60 * 60 * 1000);
}

/**
 * Retrieve customer context by CallSid
 * @param callSid Call identifier
 * @returns Customer context or undefined
 */
export function getCustomerContext(
  callSid: string,
): CustomerContext | undefined {
  return customerContextStore.get(callSid);
}

// Internal helper for backwards compatibility
function storeContext(callSid: string, context: CustomerContext): void {
  storeCustomerContext(callSid, context);
}

function getContext(callSid: string): CustomerContext | undefined {
  return getCustomerContext(callSid);
}

// Initialize Twilio client
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Initiates an outbound call with AMD enabled
 * @param request Outbound call request with phone number and optional context
 * @returns Call initiation response with CallSid
 */
export async function initiateOutboundCall(request: OutboundCallRequest) {
  const { to, customerContext, voicemailMessage, from } = request;

  console.log(`[Outbound] Initiating call to ${to}`);

  // Determine caller ID
  const callerId =
    from || config.outbound.callerId || config.twilio.outboundFrom;

  if (!callerId) {
    throw new Error(
      'No caller ID configured. Set OUTBOUND_CALLER_ID, OUTBOUND_FROM, or provide "from" parameter',
    );
  }

  // Construct webhook URLs
  const baseUrl = `https://${config.ngrok.domain}`;
  const statusCallbackUrl = `${baseUrl}/api/outbound-call-status`;
  const answerUrl = `${baseUrl}/api/outbound-call-answer`;

  // Create call parameters
  const callParams: any = {
    to,
    from: callerId,
    url: answerUrl,
    statusCallback: statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  };

  // Add AMD parameters if enabled
  if (config.outbound.enableAMD) {
    callParams.machineDetection = "Enable";
    callParams.machineDetectionTimeout = config.outbound.amdTimeout;
    callParams.machineDetectionSpeechThreshold =
      config.outbound.amdSpeechThreshold;
    callParams.machineDetectionSpeechEndThreshold =
      config.outbound.amdSpeechEndThreshold;
    callParams.asyncAmd = true; // Use async AMD for better performance
    callParams.asyncAmdStatusCallback = `${baseUrl}/api/outbound-call-amd`;
    callParams.asyncAmdStatusCallbackMethod = "POST";

    console.log(
      `[Outbound] AMD enabled with timeout ${config.outbound.amdTimeout}ms`,
    );
  }

  try {
    // Create the call
    const call = await twilioClient.calls.create(callParams);

    // Always store context for outbound calls (even if empty) to distinguish from inbound
    const contextToStore: CustomerContext = {
      ...customerContext,
      voicemailMessage: voicemailMessage || customerContext?.voicemailMessage,
    };
    storeContext(call.sid, contextToStore);

    console.log(`[Outbound] Call initiated successfully: ${call.sid}`);

    return {
      success: true,
      callSid: call.sid,
      status: call.status,
    };
  } catch (error: any) {
    console.error("[Outbound] Failed to initiate call:", error);

    throw new Error(`Failed to initiate call: ${error.message}`);
  }
}

/**
 * Handles call answer webhook (before AMD result)
 * Returns initial TwiML (pause while waiting for AMD)
 * @param callData Webhook data from Twilio
 * @returns TwiML response
 */
export async function handleOutboundCallAnswer(callData: any): Promise<string> {
  const callSid = callData.CallSid;

  console.log(`[Outbound] Call answered: ${callSid}`);

  // Return pause TwiML while waiting for async AMD result
  const response = new twiml.VoiceResponse();
  response.pause({ length: 30 }); // Wait up to 30 seconds for AMD

  return response.toString();
}

/**
 * Handles async AMD status callback
 * Routes call based on human vs machine detection
 * @param amdData AMD result data from Twilio
 */
export async function handleAMDStatus(amdData: AMDStatusUpdate): Promise<void> {
  const { CallSid, AnsweredBy, MachineDetectionDuration } = amdData;

  console.log(
    `[AMD] Result for ${CallSid}: ${AnsweredBy} (detection took ${MachineDetectionDuration}ms)`,
  );

  // Route based on AMD result
  if (AnsweredBy === "human") {
    console.log(`[AMD] Human detected, connecting to ConversationRelay`);
    await redirectToConversationRelay(CallSid);
  } else if (AnsweredBy === "machine") {
    console.log(`[AMD] Machine detected, playing voicemail`);
    await redirectToVoicemail(CallSid);
  } else {
    // Unknown or fax - treat as human to be safe
    console.log(`[AMD] Unknown result (${AnsweredBy}), treating as human`);
    await redirectToConversationRelay(CallSid);
  }
}

/**
 * Redirects an active call to ConversationRelay
 * @param callSid Call identifier
 */
async function redirectToConversationRelay(callSid: string): Promise<void> {
  const baseUrl = `https://${config.ngrok.domain}`;
  const twimlUrl = `${baseUrl}/api/outbound-call-connect?CallSid=${callSid}`;

  try {
    await twilioClient.calls(callSid).update({
      url: twimlUrl,
      method: "POST",
    });

    console.log(`[Outbound] Redirected ${callSid} to ConversationRelay`);
  } catch (error: any) {
    console.error(`[Outbound] Failed to redirect to ConversationRelay:`, error);
  }
}

/**
 * Redirects an active call to voicemail playback
 * @param callSid Call identifier
 */
async function redirectToVoicemail(callSid: string): Promise<void> {
  const baseUrl = `https://${config.ngrok.domain}`;
  const twimlUrl = `${baseUrl}/api/outbound-call-voicemail?CallSid=${callSid}`;

  try {
    await twilioClient.calls(callSid).update({
      url: twimlUrl,
      method: "POST",
    });

    console.log(`[Outbound] Redirected ${callSid} to voicemail`);
  } catch (error: any) {
    console.error(`[Outbound] Failed to redirect to voicemail:`, error);
  }
}

/**
 * Generates TwiML to connect to ConversationRelay with customer context
 * Supports both direct mode and conference mode based on USE_CONFERENCE
 * @param callData Webhook data from Twilio
 * @returns TwiML response
 */
export async function handleConversationRelayConnect(
  callData: any,
): Promise<string> {
  const callSid = callData.CallSid;
  const customerContext = getContext(callSid);

  console.log(
    `[Outbound] Connecting ${callSid} to ConversationRelay with context:`,
    customerContext ? "yes" : "no",
  );

  // Generate outbound-specific welcome greeting
  let welcomeGreeting: string;

  if (customerContext?.name) {
    // Personalized greeting - AI will confirm identity in next turn
    welcomeGreeting = `Hello, this is Anna calling from Owl Health. May I speak with ${customerContext.name}?`;
  } else {
    // Generic outbound greeting (no context)
    welcomeGreeting = `Hello, this is Anna calling from Owl Health. I'm trying to reach you regarding your account. Am I speaking with the account holder?`;
  }

  // Check if conference mode is enabled
  if (!config.twilio.useConference) {
    // Direct mode - connect customer directly to ConversationRelay
    console.log(`[Outbound] Direct mode - connecting ${callSid} directly to ConversationRelay`);

    return ConversationRelayHelper.createConversationRelayResponse(
      undefined, // actionUrl - use default
      { welcomeGreeting }, // relayConfig
    );
  }

  // Conference mode - place customer in conference and add AI participant
  console.log(`[Outbound] Conference mode - placing ${callSid} in conference`);

  const conferenceName = `outbound-${callSid}`;
  const outboundTo = config.twilio.outboundTo!;
  const outboundFrom = config.twilio.outboundFrom!;

  // Create TwiML to place the customer in a conference
  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.conference(
    {
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
    },
    conferenceName,
  );

  // Store conference name and greeting in context for the AI participant leg
  // We use a special key with the conference name to retrieve later
  storeCustomerContext(`conference:${conferenceName}`, {
    ...customerContext,
    conferenceName,
    welcomeGreeting,
    originalCallSid: callSid,
  });

  // Add AI participant to the conference
  // The 'to' parameter (TwiML App or phone) must be configured to call
  // /api/outbound-conference-leg endpoint
  try {
    const participant = await twilioClient
      .conferences(conferenceName)
      .participants.create({
        to: outboundTo, // TwiML App or phone number
        from: outboundFrom,
        earlyMedia: true,
        endConferenceOnExit: false,
      });

    console.log(
      `[Outbound] AI participant added: ${participant.callSid} to conference: ${conferenceName}`,
    );
  } catch (error: any) {
    console.error('[Outbound] Failed to add AI participant to conference:', error);
    // Still return conference TwiML even if participant creation fails
  }

  return response.toString();
}

/**
 * Handles the AI participant leg in outbound conference mode
 * This endpoint should be configured as the Voice URL for the TwiML App
 * used for outbound conference calls (different from inbound conference leg)
 * Returns ConversationRelay TwiML with outbound greeting
 * @param callData Webhook data from Twilio
 * @returns TwiML response
 */
export async function handleOutboundConferenceLeg(callData: any): Promise<string> {
  const conferenceName = callData.FriendlyName || callData.ConferenceSid;

  console.log(
    `[Outbound] AI conference leg answering, conference: ${conferenceName}`,
  );

  // Try to find context by conference name
  let customerContext = getCustomerContext(`conference:${conferenceName}`);

  // Fallback: search for context with matching conference name
  if (!customerContext) {
    console.log(`[Outbound] Context not found by conference name, searching...`);
    // This is a simple approach - in production, use proper storage
  }

  // Get the welcome greeting from stored context
  const welcomeGreeting = customerContext?.welcomeGreeting ||
    'Hello, this is Anna calling from Owl Health. I\'m trying to reach you regarding your account.';

  console.log(`[Outbound] Using welcome greeting for AI leg`);

  // Return ConversationRelay TwiML with outbound greeting
  return ConversationRelayHelper.createConversationRelayResponse(
    undefined, // actionUrl - use default
    { welcomeGreeting }, // relayConfig
  );
}

/**
 * Generates TwiML to play voicemail message
 * @param callData Webhook data from Twilio
 * @returns TwiML response
 */
export async function handleVoicemail(callData: any): Promise<string> {
  const callSid = callData.CallSid;
  const customerContext = getContext(callSid);

  // Get custom voicemail or use default
  const message =
    customerContext?.voicemailMessage || config.outbound.voicemailMessage;

  console.log(`[Outbound] Playing voicemail for ${callSid}`);

  // Create TwiML response
  const response = new twiml.VoiceResponse();
  response.say({ voice: "Polly.Joanna" }, message);
  response.hangup();

  return response.toString();
}

/**
 * Handles call status updates
 * @param statusData Status update data from Twilio
 */
export async function handleCallStatus(statusData: any): Promise<void> {
  const { CallSid, CallStatus, CallDuration } = statusData;

  console.log(
    `[Outbound] Status update: ${CallSid} - ${CallStatus} - Duration: ${CallDuration || "N/A"}s`,
  );

  // Handle failure states
  if (["failed", "busy", "no-answer"].includes(CallStatus)) {
    console.warn(`[Outbound] Call ${CallSid} ${CallStatus}`);
  }
}
