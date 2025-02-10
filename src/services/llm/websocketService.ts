import { WebSocketServer, WebSocket } from "ws";
import LLMService from "./llmService";
import { ConversationRelayMessage } from "../../types";
import {config} from "../../config";
import { DTMFHelper } from "./dtmfHelper";


export function initializeWebSocketHandlers(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");

    const llmService = new LLMService();
    const dtmfHelper = new DTMFHelper();

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
              llmService.streamChatCompletion([
                { role: "system", content: processedDTMF },
              ]);
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
      const endMessage = {
        type: "end",
        handoffData: JSON.stringify(message), // important to stringify the object
      };

      ws.send(JSON.stringify(endMessage));
    });

    llmService.on("switchLanguage", (message: any) => {

      const languageCode = config.languages[message.targetLanguage]?.locale_code;
      if (!languageCode) {
        console.info("Language not supported");
        return;
      }

      const languageMessage = { 
        type: "language",
        ttsLanguage: languageCode,
        transcriptionLanguage: languageCode
      }

      console.log("Switch Language", languageMessage);
      ws.send(JSON.stringify(languageMessage))
    });
  });
}

