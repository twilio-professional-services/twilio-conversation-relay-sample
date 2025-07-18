import { WebSocketServer, WebSocket } from "ws";
import LLMService from "./llmService";
import { ConversationRelayMessage } from "../../types";
import { config } from "../../config";
import { DTMFHelper } from "./dtmfHelper";
import { IdleTimer } from "./idleTimer";

export function initializeWebSocketHandlers(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");

    const llmService = new LLMService();
    const dtmfHelper = new DTMFHelper();
    const idleTimer = new IdleTimer(10000, dtmfHelper); // 10 seconds timeout

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

    ws.on("message", (message: string) => {
      try {
        const parsedMessage: ConversationRelayMessage = JSON.parse(message);
        console.log("Parsed message:", parsedMessage);
        switch (parsedMessage.type) {
          case "prompt":
            llmService.streamChatCompletion([
              { role: "user", content: parsedMessage.voicePrompt },
            ]);
            break;
          case "setup":
            llmService.setup(parsedMessage);
            break;
          case "error":
            // Handle error case if needed
            break;
          case "interrupt":
            llmService.userInterrupted = true;
            break;
          case "dtmf":
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
      idleTimer.clear(); // Clear timer on connection close
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
  });
}
