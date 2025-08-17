import { OpenAI } from "openai";

export interface LLMServiceState {
  sessionId: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  userInterrupted?: boolean;
  timestamp: number;
}

export class StateManager {
  private static instance: StateManager;
  private sessionStates: Map<string, LLMServiceState> = new Map();
  private readonly STATE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  saveState(sessionId: string, state: LLMServiceState): void {
    console.log(`Saving state for session ${sessionId}`);
    this.sessionStates.set(sessionId, {
      ...state,
      timestamp: Date.now(),
    });
    
    // Clean up old states
    this.cleanupOldStates();
  }

  restoreState(sessionId: string): LLMServiceState | null {
    const state = this.sessionStates.get(sessionId);
    
    if (!state) {
      console.log(`No saved state found for session ${sessionId}`);
      return null;
    }

    // Check if state is too old
    if (Date.now() - state.timestamp > this.STATE_TIMEOUT) {
      console.log(`State for session ${sessionId} has expired`);
      this.sessionStates.delete(sessionId);
      return null;
    }

    console.log(`Restoring state for session ${sessionId}`);
    return state;
  }

  deleteState(sessionId: string): void {
    console.log(`Deleting state for session ${sessionId}`);
    this.sessionStates.delete(sessionId);
  }

  private cleanupOldStates(): void {
    const now = Date.now();
    for (const [sessionId, state] of this.sessionStates.entries()) {
      if (now - state.timestamp > this.STATE_TIMEOUT) {
        this.sessionStates.delete(sessionId);
        console.log(`Cleaned up expired state for session ${sessionId}`);
      }
    }
  }
}
