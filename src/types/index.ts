
export interface CallDetails {
  Called: string;          // Phone number being called
  CalledZip: string;       // ZIP code of called number
  CalledCity: string;      // City of called number
  CalledState: string;     // State of called number
  CalledCountry: string;   // Country of called number
  
  To: string;              // Destination phone number
  ToZip: string;           // ZIP code of destination
  ToCity: string;          // City of destination
  ToState: string;         // State of destination
  ToCountry: string;       // Country of destination
  
  From: string;            // Originating phone number
  FromZip: string;         // ZIP code of originator
  FromCity: string;        // City of originator
  FromState: string;       // State of originator
  FromCountry: string;     // Country of originator
  
  Caller: string;          // Caller's phone number
  CallerZip: string;       // ZIP code of caller
  CallerCity: string;      // City of caller
  CallerState: string;     // State of caller
  CallerCountry: string;   // Country of caller
  
  CallSid: string;         // Unique call identifier
  AccountSid: string;      // Twilio account identifier
  
  Direction: 'inbound' | 'outbound' | 'both';  // Call direction
  CallStatus: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  
  ApiVersion: string;      // Twilio API version
  
  AddOns?: {
    status: string;
    message: string | null;
    code: string | null;
    results: Record<string, unknown>;
  };
}

export interface WebSocketMessage {
  type: 'register' | 'call' | 'error';
  data?: any;
}
