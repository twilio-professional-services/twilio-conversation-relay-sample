import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

import callRoutes from './routes/callRoutes';
import { setupWebSocketHandlers } from './services/websocketService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', callRoutes);

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });
setupWebSocketHandlers(wss);

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { app, server };
