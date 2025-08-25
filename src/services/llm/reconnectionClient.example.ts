/**
 * Example client code demonstrating how to handle WebSocket reconnection
 * with state persistence for the Twilio Conversation Relay.
 * 
 * This client shows how to:
 * 1. Establish initial connection with session setup
 * 2. Handle unexpected disconnections
 * 3. Reconnect and restore previous session state
 * 4. Continue DTMF input flow seamlessly
 */

// Example usage for client-side reconnection handling
export class ConversationRelayClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second delay

  constructor(private url: string, sessionId?: string) {
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  connect(isReconnection: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.isReconnecting = false;

          // Send setup message
          this.sendSetupMessage(isReconnection);
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          
          if (!this.isReconnecting && event.code !== 1000) { // 1000 = normal closure
            this.handleUnexpectedDisconnection();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleUnexpectedDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(true).catch((error) => {
          console.error('Reconnection failed:', error);
          // Double the delay for next attempt (exponential backoff)
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
          this.handleUnexpectedDisconnection();
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. Connection failed permanently.');
    }
  }

  private sendSetupMessage(isReconnection: boolean) {
    const setupMessage = {
      type: 'setup',
      sessionId: this.sessionId,
      reconnection: isReconnection,
      callSid: 'example_call_sid',
      parentCallSid: 'example_parent_call_sid',
      from: '+1234567890',
      to: '+0987654321',
      forwardedFrom: '',
      callerName: 'Test Caller',
      direction: 'inbound',
      callType: 'voice',
      callStatus: 'in-progress',
      accountSid: 'example_account_sid',
      applicationSid: 'example_app_sid'
    };

    this.send(setupMessage);
  }

  private handleMessage(message: any) {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'text':
        console.log('AI Response:', message.token);
        break;
      case 'language':
        console.log('Language switched:', message);
        break;
      case 'idleTimeout':
        console.log('Idle timeout occurred:', message.message);
        break;
      case 'error':
        console.error('Server error:', message.message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  sendDTMF(digit: string) {
    this.send({
      type: 'dtmf',
      digit: digit
    });
  }

  sendPrompt(text: string) {
    this.send({
      type: 'prompt',
      voicePrompt: text
    });
  }

  sendInterrupt() {
    this.send({
      type: 'interrupt'
    });
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    this.isReconnecting = false; // Prevent automatic reconnection
    if (this.ws) {
      this.ws.close(1000, 'Client requested disconnect');
    }
  }
}

// Example usage:
/*
const client = new ConversationRelayClient('ws://localhost:8080');

client.connect().then(() => {
  console.log('Connected successfully');
  
  // Send initial prompt
  client.sendPrompt("Hello, I need help with my account.");
  
  // Simulate DTMF input after 2 seconds
  setTimeout(() => {
    client.sendDTMF("1"); // Switch to Spanish
  }, 2000);
  
  // Simulate more DTMF input for phone number
  setTimeout(() => {
    for (let i = 0; i < 10; i++) {
      client.sendDTMF(Math.floor(Math.random() * 10).toString());
    }
  }, 5000);
  
}).catch((error) => {
  console.error('Connection failed:', error);
});

// The client will automatically handle disconnections and reconnections
// maintaining the session state across network interruptions
*/
