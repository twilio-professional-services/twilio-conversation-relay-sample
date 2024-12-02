import { WebSocketServer, WebSocket } from 'ws';
import LLMService from './llm/llmService';

export function setupWebSocketHandlers(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    const llmService = new LLMService();

    ws.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log('Parsed message:', parsedMessage);
      if (parsedMessage.type === 'prompt') {
         // llmService.chatCompletion([{ role: "user", content : parsedMessage.voicePrompt }]);

         llmService.streamChatCompletion([{ role: "user", content : parsedMessage.voicePrompt }]);
      } else {
        // handleWebSocketMessage(ws, parsedMessage);
      }
      } catch (error) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    llmService.on('chatCompletion:complete', (message: any) => {
      const textMessage = {
        type: 'text',
        token: message.content,
        last: true,
      };
      ws.send(
        JSON.stringify(
          textMessage
        )
      );
    });

    llmService.on('streamChatCompletion:partial', (content: any) => {
      const textMessage = {
        type: 'text',
        token: content,
        last: false,
      };
      ws.send(
        JSON.stringify(
          textMessage
        )
      );
    });

    llmService.on('streamChatCompletion:complete', (message: any) => {
      const textMessage = {
        type: 'text',
        token: message.content,
        last: false,
      };
      ws.send(
        JSON.stringify(
          textMessage
        )
      );
    });


    // llmService.on('chatCompletion:complete', (message: any) => {
    //   ws.send(JSON.stringify({ 
    //     type: 'chatCompletion', 
    //     message 
    //   }));
    // });


  });
}

function handleWebSocketMessage(ws: WebSocket, message: any) {
  console.log('Received message:', message);
  switch (message.type) {
    case 'setup':
      handleSetup(ws, message.data);
      break;
    case 'prompt':
      handlePrompt(ws, message.data);
      break;
    default:
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Unknown message type' 
      }));
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
