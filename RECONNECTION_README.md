# WebSocket Reconnection with State Persistence

This implementation adds robust WebSocket reconnection handling with state persistence for the Twilio Conversation Relay sample. It ensures that conversations can continue seamlessly even after network interruptions.

## Features

### 1. State Management
- **StateManager**: A singleton class that manages conversation states across multiple sessions
- **Session Persistence**: Conversations are saved automatically when connections are lost
- **State Restoration**: Previous conversation context is restored when clients reconnect
- **Automatic Cleanup**: Old states are automatically cleaned up after 30 minutes

### 2. Reconnection Handling
- **Automatic Reconnection**: Clients can implement automatic reconnection logic
- **Session Continuity**: DTMF input state and conversation history are maintained
- **Grace Period**: 5-minute window for reconnection before session cleanup
- **Error Recovery**: Proper error handling for various disconnect scenarios

### 3. Enhanced DTMF Support
- **Multi-input Types**: Supports language switch, phone numbers, date of birth, etc.
- **Input Buffering**: Digits are collected until the expected input length is reached
- **State Transitions**: Proper state management for different input types
- **Idle Timer**: Automatic timeout handling for DTMF input collection

## Architecture Changes

### LLMService Updates
```typescript
// New state management methods
public saveState(): void
public restoreState(sessionId: string): boolean
public clearState(): void

// Enhanced setup method with reconnection support
async setup(message: SetupMessage): Promise<void>
```

### WebSocket Handler Updates
```typescript
// Session management
const activeSessions = new Map<string, SessionData>();

// Reconnection support in setup message
type SetupMessage = {
  // ... existing fields
  reconnection?: boolean; // New field for reconnection detection
}
```

### State Manager
```typescript
interface LLMServiceState {
  sessionId: string;
  messages: ChatCompletionMessageParam[];
  userInterrupted?: boolean;
  timestamp: number;
}
```

## Usage

### Client-Side Implementation

```typescript
import { ConversationRelayClient } from './reconnectionClient.example';

const client = new ConversationRelayClient('ws://localhost:8080');

// Connect with automatic reconnection
client.connect().then(() => {
  console.log('Connected successfully');
  
  // Normal conversation flow
  client.sendPrompt("Hello, I need help with my account.");
  
  // DTMF input
  client.sendDTMF("1"); // Language switch
}).catch(console.error);
```

### Server-Side Setup Message

```typescript
// Initial connection
{
  type: 'setup',
  sessionId: 'unique_session_id',
  reconnection: false,
  // ... other setup fields
}

// Reconnection
{
  type: 'setup',
  sessionId: 'same_session_id',
  reconnection: true,
  // ... other setup fields
}
```

## Flow Diagram

```
Client Connection
       ↓
   Setup Message
       ↓
  Session Check -----> New Session: Create LLMService
       ↓                    ↓
  Existing Session    Store Session State
       ↓                    ↓
  Restore State       Setup Event Listeners
       ↓                    ↓
  Continue Conversation <---+
       ↓
  Network Disconnect
       ↓
  Save State + Start Cleanup Timer
       ↓
  Client Reconnects (within 5 min)
       ↓
  Restore State + Continue
```

## Configuration

### Timeouts
- **Idle Timer**: 10 seconds (DTMF input timeout)
- **State Cleanup**: 5 minutes (reconnection grace period)
- **State Expiry**: 30 minutes (maximum state retention)

### Session Management
- **Session Storage**: In-memory Map (can be extended to Redis/Database)
- **Cleanup Strategy**: Automatic timeout-based cleanup
- **Concurrency**: Thread-safe state operations

## Benefits

1. **Improved User Experience**: Conversations continue seamlessly after network issues
2. **Data Integrity**: No loss of conversation context or DTMF input state
3. **Reliability**: Robust error handling and recovery mechanisms
4. **Scalability**: Efficient memory management with automatic cleanup
5. **Flexibility**: Easy to extend for different storage backends

## Error Scenarios Handled

- **Abrupt Network Disconnection**: State saved on connection loss
- **Server Restart**: State persists in memory (can be extended to persistent storage)
- **Client Crash**: Server maintains state for reconnection window
- **Partial DTMF Input**: Input buffer state preserved across reconnections
- **Multiple Reconnection Attempts**: Exponential backoff and retry limits

## Future Enhancements

1. **Persistent Storage**: Replace in-memory storage with Redis/Database
2. **Load Balancing**: Session affinity for distributed deployments
3. **Metrics**: Connection quality and reconnection statistics
4. **Security**: Enhanced session validation and encryption
5. **Configuration**: Runtime configuration for timeouts and limits
