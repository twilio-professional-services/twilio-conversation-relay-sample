import { WebSocketServer, WebSocket } from "ws";
import LLMService from "./llmService";
import { ConversationRelayMessage } from "../../types";
import { config } from "../../config";
import { DTMFHelper } from "./dtmfHelper";
import { IdleTimer } from "./idleTimer";
import { StateManager } from "./stateManager";

// Global map to track active sessions and their services
const activeSessions = new Map<
  string,
  { llmService: LLMService; dtmfHelper: DTMFHelper; idleTimer: IdleTimer }
>();

export function initializeWebSocketHandlers(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");

    let llmService: LLMService;
    let dtmfHelper: DTMFHelper;
    let idleTimer: IdleTimer;
    let currentSessionId: string = "";

    // Automatically close the WebSocket after 30 seconds for simulation
    // setTimeout(() => {
    //   if (ws.readyState === WebSocket.OPEN) {
    //     console.log("Simulating WebSocket close after 30 seconds");
    //     ws.close();
    //   }
    // }, 30000);

    // Function to initialize or restore session
    const initializeSession = (sessionId: string) => {
      currentSessionId = sessionId;

      // Check if we have an existing session to restore
      const existingSession = activeSessions.get(sessionId);

      if (existingSession) {
        // Restore existing session
        console.log(`Restoring session ${sessionId} after reconnection`);
        llmService = existingSession.llmService;
        dtmfHelper = existingSession.dtmfHelper;
        idleTimer = existingSession.idleTimer;
      } else {
        // Create new session
        console.log(`Creating new session ${sessionId}`);
        llmService = new LLMService();
        dtmfHelper = new DTMFHelper();
        idleTimer = new IdleTimer(10000, dtmfHelper); // 10 seconds timeout

        // Store session for potential reconnection
        activeSessions.set(sessionId, { llmService, dtmfHelper, idleTimer });
      }

      setupEventListeners();
    };

    const setupEventListeners = () => {
      // Remove any existing listeners to prevent duplicates
      llmService.removeAllListeners();
      idleTimer.removeAllListeners();

      idleTimer.on("idleTimeout", (data) => {
        console.log("Idle timer expired. Resetting state.");
        llmService.streamChatCompletion([
          {
            role: "user",
            content: "dtmf input was not received. please reprompt the user.",
          },
        ]);
        dtmfHelper.resetState(); // Reset DTMF state
      });

      llmService.on("chatCompletion:complete", (message: any) => {
        const textMessage = {
          type: "text",
          token: message.content,
          last: true,
        };
        ws.send(JSON.stringify(textMessage));
      });

      llmService.on("streamChatCompletion:partial", (content: any) => {
        const textMessage = {
          type: "text",
          token: content,
          last: false,
        };
        ws.send(JSON.stringify(textMessage));
      });

      llmService.on("streamChatCompletion:complete", (message: any) => {
        const textMessage = {
          type: "text",
          token: message.content,
          last: false,
        };
        ws.send(JSON.stringify(textMessage));
      });

      llmService.on("humanAgentHandoff", (message: any) => {
        console.log("Human Agent Handoff", message);
        const endMessage = {
          type: "end",
          handoffData: JSON.stringify(message), // important to stringify the object
        };
        ws.send(JSON.stringify(endMessage));
      });

      llmService.on("dtmfInput", (state: string) => {
        console.log("dtmf input field:", state);
        dtmfHelper.setState(state); // Set the new state
        idleTimer.start(); // Start idle timer when expecting DTMF input
      });

      llmService.on("switchLanguage", (message: any) => {
        const languageCode =
          config.languages[message.targetLanguage]?.locale_code;
        if (!languageCode) {
          console.info("Language not supported");
          return;
        }

        const languageMessage = {
          type: "language",
          ttsLanguage: languageCode,
          transcriptionLanguage: languageCode,
        };

        console.log("Switch Language", languageMessage);
        ws.send(JSON.stringify(languageMessage));
      });
    };

    ws.on("message", (message: string) => {
      try {
        const parsedMessage: ConversationRelayMessage = JSON.parse(message);
        console.log("Parsed message:", parsedMessage);

        switch (parsedMessage.type) {
          case "setup":
            // callSid as sessionId
            const sessionId = parsedMessage.callSid;
            initializeSession(sessionId);
            llmService.setup(parsedMessage);
            break;

          case "prompt":
            if (!llmService) {
              console.error(
                "LLMService not initialized. Setup message required first."
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Session not initialized",
                })
              );
              return;
            }
            llmService.streamChatCompletion([
              { role: "user", content: parsedMessage.voicePrompt },
            ]);
            break;

          case "error":
            // Handle error case if needed
            break;

          case "interrupt":
            if (llmService) {
              llmService.userInterrupted = true;
            }
            break;

          case "dtmf":
            if (!dtmfHelper || !idleTimer || !llmService) {
              console.error("Services not initialized for DTMF handling");
              return;
            }

            console.log("DTMF Message", parsedMessage);
            const processedDTMF = dtmfHelper.processDTMF(parsedMessage.digit);

            // Reset idle timer on receiving a new DTMF message
            idleTimer.start();

            // Only call streamChatCompletion if the collection is completed
            if (dtmfHelper["isCollectionComplete"] === true) {
              llmService.streamChatCompletion([
                { role: "system", content: processedDTMF },
              ]);
              dtmfHelper.resetState(); // Reset state after completion
            }
            break;

          default:
            console.warn(`Unknown message type: ${parsedMessage.type}`);
        }
      } catch (error) {
        console.error(`Error parsing message: ${message}`, error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");

      // Save state before connection closes
      if (llmService && currentSessionId) {
        llmService.saveState();
        console.log(`State saved for session ${currentSessionId}`);
      }

      if (idleTimer) {
        idleTimer.clear(); // Clear timer on connection close
      }

      // Clean up session after a delay to allow for reconnection
      setTimeout(() => {
        if (currentSessionId && activeSessions.has(currentSessionId)) {
          console.log(`Cleaning up session ${currentSessionId} after timeout`);
          activeSessions.delete(currentSessionId);
          if (llmService) {
            llmService.clearState();
          }
        }
      }, 5 * 60 * 1000); // 5 minute grace period for reconnection
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);

      // Save state on error
      if (llmService && currentSessionId) {
        llmService.saveState();
        console.log(`State saved for session ${currentSessionId} due to error`);
      }
    });
  });
}
