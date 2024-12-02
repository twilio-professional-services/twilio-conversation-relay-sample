import { CallDetails } from '../types';
import { config } from '../config';


export async function handleIncomingCall(callData: CallDetails): Promise<string> {
  // Validate and process incoming call
  if (!callData) {
    throw new Error('Invalid call data');
  }

  return `<Response>
              <Connect action="https://myhttpserver.com/connect_action">
                    <ConversationRelay url="wss://${config.ngrok.domain}" welcomeGreeting="${config.twilio.welcomeGreeting}" />
              </Connect>
          </Response>`;
}
