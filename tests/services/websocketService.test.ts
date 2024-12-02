import WebSocket from 'ws';
import { setupWebSocketHandlers } from '../../src/services/websocketService';

describe('WebSocket Service', () => {
  let wss: WebSocket.Server;
  let mockWs: WebSocket;

  beforeEach(() => {
    wss = new WebSocket.Server({ port: 0 });
    mockWs = new WebSocket('ws://localhost:0');
    setupWebSocketHandlers(wss);
  });

  afterEach(() => {
    wss.close();
    mockWs.close();
  });

  it('should handle registration message', (done) => {
    mockWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('registration');
      expect(message.status).toBe('success');
      done();
    });

    mockWs.send(JSON.stringify({
      type: 'register',
      data: { clientId: 'test-client' }
    }));
  });

  it('should handle call request message', (done) => {
    mockWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('call');
      expect(message.status).toBe('initiated');
      done();
    });

    mockWs.send(JSON.stringify({
      type: 'call',
      data: { target: '+1234567890' }
    }));
  });
});
