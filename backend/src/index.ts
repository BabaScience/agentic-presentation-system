/* ═══════════════════════════════════════════════════════════════
   Agentic Presentation System V2 — Server Entry Point
   Express REST + WebSocket Gateway
   ═══════════════════════════════════════════════════════════════ */

import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { WebSocketGateway } from './websocket/gateway';
import { sessionRouter } from './routes/sessions';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: process.uptime(),
    services: {
      agent: 'ready',
      knowledgeGraph: 'ready',
      voice: process.env.ELEVENLABS_API_KEY ? 'ready' : 'no-key',
      rl: 'ready',
    },
  });
});

// ── REST Routes ──────────────────────────────────────────────
app.use('/api', sessionRouter);

// ── WebSocket Gateway ────────────────────────────────────────
const wsGateway = new WebSocketGateway(server);
wsGateway.initialize();

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  Agentic Presentation System V2                   ║
  ║  Active Presenter + Cognitive Scaffolding          ║
  ║─────────────────────────────────────────────────── ║
  ║  REST API:    http://localhost:${PORT}              ║
  ║  WebSocket:   ws://localhost:${PORT}/ws              ║
  ║  Health:      http://localhost:${PORT}/health        ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export { server, wsGateway };
