#!/usr/bin/env node

import express from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error('Starting HTTP/SSE wrapper for Chroma MCP...');

const app = express();
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Store active MCP processes and their SSE connections
const sessions = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size
  });
});

// SSE endpoint for MCP communication
app.get('/mcp', (req, res) => {
  const sessionId = randomUUID();
  console.error(`New SSE connection established: ${sessionId}`);
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Session-ID': sessionId
  });

  // Send initial connection event
  res.write(`event: connected\n`);
  res.write(`data: {"sessionId": "${sessionId}"}\n\n`);

  // Spawn the chroma-mcp process
  const chromaProcess = spawn('docker', [
    'run', '--rm', '-i', '--network', 'chroma-mcp_default',
    'mcp/chroma:latest',
    'chroma-mcp', '--client-type', 'http', '--host', 'chroma-db', '--port', '8000', '--ssl', 'false'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Store session info
  sessions.set(sessionId, {
    process: chromaProcess,
    response: res,
    connected: true
  });

  // Handle messages from the MCP process
  chromaProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.error(`[${sessionId}] MCP stdout: ${message}`);
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify({ type: 'stdout', content: message })}\n\n`);
    }
  });

  chromaProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.error(`[${sessionId}] MCP stderr: ${message}`);
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify({ type: 'stderr', content: message })}\n\n`);
    }
  });

  // Handle process exit
  chromaProcess.on('close', (code) => {
    console.error(`[${sessionId}] MCP process exited with code ${code}`);
    res.write(`event: close\n`);
    res.write(`data: {"code": ${code}}\n\n`);
    res.end();
    sessions.delete(sessionId);
  });

  // Handle client disconnect
  req.on('close', () => {
    console.error(`[${sessionId}] Client disconnected`);
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      if (session.process && !session.process.killed) {
        session.process.kill('SIGTERM');
      }
      sessions.delete(sessionId);
    }
  });
});

// POST endpoint for sending messages to MCP
app.post('/mcp/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions.get(sessionId);
  
  try {
    // Send message to the MCP process
    session.process.stdin.write(JSON.stringify(message) + '\n');
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error(`[${sessionId}] Error sending message:`, error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// List active sessions
app.get('/sessions', (req, res) => {
  const activeSessions = Array.from(sessions.keys()).map(sessionId => ({
    sessionId,
    connected: sessions.get(sessionId).connected
  }));
  
  res.json({ sessions: activeSessions });
});

// Terminate a session
app.delete('/mcp/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions.get(sessionId);
  
  try {
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM');
    }
    sessions.delete(sessionId);
    res.json({ success: true, message: 'Session terminated' });
  } catch (error) {
    console.error(`[${sessionId}] Error terminating session:`, error);
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

// Start the server
const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  console.error(`Chroma MCP HTTP/SSE Server listening on port ${PORT}`);
  console.error(`Health check: http://localhost:${PORT}/health`);
  console.error(`SSE endpoint: http://localhost:${PORT}/mcp`);
  console.error(`Sessions API: http://localhost:${PORT}/sessions`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down server...');
  
  // Terminate all active sessions
  for (const [sessionId, session] of sessions) {
    console.error(`Terminating session: ${sessionId}`);
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM');
    }
  }
  
  sessions.clear();
  console.error('Server shutdown complete');
  process.exit(0);
});
