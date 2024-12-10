import { WebSocketServer, WebSocket } from "ws";
import LLMService from "./llmService";
import { ConversationRelayMessage } from "../../types";


export function setupWebSocketHandlers(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");

    const llmService = new LLMService();

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
            // handleWebSocketMessage(ws, parsedMessage);
            break;
          case "error":
            // Parsed message: {
            // type: 'error',
            // description: 'Invalid message received: {"type":"tex","token":" To","last":false}'
            // }
            // Handle error case if needed
            break;
          case "interrupt":
            llmService.userInterrupted = true;
            break;
          default:
            console.warn("Unknown message type");
        }
      } catch (error) {
        console.error("Error parsing message:", error);
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

    llmService.on("toolCall:humanAgentHandoff", (message: any) => {
      const endMessage = {
        type: "end",
        handoffData: JSON.stringify(message), // important to stringify the object
      };

      ws.send(JSON.stringify(endMessage));
    });

  });
}

function handleWebSocketMessage(ws: WebSocket, message: any) {
  console.log("Received message:", message);
  switch (message.type) {
    case "setup":
      handleSetup(ws, message.data);
      break;
    case "prompt":
      handlePrompt(ws, message.data);
      break;
    default:
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Unknown message type",
        })
      );
  }
}

function handleSetup(ws: WebSocket, data: any) {
  // Implement registration logic
  // ws.send(JSON.stringify({
  //   type: 'registration',
  //   status: 'success',
  //   id: data.clientId
  // }));
}

function handlePrompt(ws: WebSocket, data: any) {
  // Implement call request logic
  // ws.send(JSON.stringify({
  //   type: 'call',
  //   status: 'initiated',
  //   callId: Date.now().toString()
  // }));
}
