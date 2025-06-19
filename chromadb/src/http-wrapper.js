#!/usr/bin/env node

import express from 'express';
import { spawn } from 'child_process';
impo  // Spawn the chroma-mcp process using Python from virtual environment
  const pythonExecutable = path.join(__dirname, '..', 'mcp-server', 'venv', 'bin', 'python');
  const pythonArgs = [
    path.join(__dirname, '..', 'mcp-server', 'chroma_mcp', 'server.py'),
    '--client-type', 'http', 
    '--host', config.chromadbHost, 
    '--port', config.chromadbPort
  ];

  console.log(`🐍 Spawning MCP process: ${pythonExecutable} ${pythonArgs.join(' ')}`);
  
  const chromaProcess = spawn(pythonExecutable, pythonArgs, {UUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment variables
const config = {
  port: process.env.HTTP_PORT || 8002,
  chromadbHost: process.env.CHROMADB_HOST || 'chromadb',
  chromadbPort: process.env.CHROMADB_PORT || '8000'
};

console.log('🚀 Starting ChromaDB MCP HTTP/SSE wrapper...');
console.log('📊 Configuration:', config);

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Store active MCP processes and their SSE connections
const sessions = new Map();

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ChromaDB MCP HTTP/SSE Server',
    version: '1.0.0',
    description: 'HTTP/SSE wrapper for ChromaDB Model Context Protocol server',
    endpoints: {
      health: 'GET /health',
      sessions: 'GET /sessions', 
      connect: 'GET /mcp',
      send: 'POST /mcp/:sessionId',
      terminate: 'DELETE /mcp/:sessionId'
    },
    config: {
      chromadbHost: config.chromadbHost,
      chromadbPort: config.chromadbPort,
      activeSessions: sessions.size
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    config: {
      chromadbHost: config.chromadbHost,
      chromadbPort: config.chromadbPort
    }
  });
});

// SSE endpoint for MCP communication
app.get('/mcp', (req, res) => {
  const sessionId = randomUUID();
  console.log(`🔌 New SSE connection: ${sessionId}`);
  
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
  res.write(`data: ${JSON.stringify({ sessionId, timestamp: new Date().toISOString() })}\n\n`);

  // Spawn the chroma-mcp process using Python
  const pythonArgs = [
    path.join(__dirname, '..', 'mcp-server', 'chroma_mcp', 'server.py'),
    '--client-type', 'http', 
    '--host', config.chromadbHost, 
    '--port', config.chromadbPort
  ];

  console.log(`� Spawning MCP process: python3 ${pythonArgs.join(' ')}`);
  
  const chromaProcess = spawn('python3', pythonArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CHROMA_HOST: config.chromadbHost,
      CHROMA_PORT: config.chromadbPort,
      CHROMA_CLIENT_TYPE: 'http'
    }
  });

  // Store session info
  sessions.set(sessionId, {
    process: chromaProcess,
    response: res,
    connected: true,
    createdAt: new Date().toISOString()
  });

  // Handle messages from the MCP process
  chromaProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`📤 [${sessionId}] MCP stdout: ${message}`);
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify({ type: 'stdout', content: message, timestamp: new Date().toISOString() })}\n\n`);
    }
  });

  chromaProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`⚠️  [${sessionId}] MCP stderr: ${message}`);
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify({ type: 'stderr', content: message, timestamp: new Date().toISOString() })}\n\n`);
    }
  });

  // Handle process exit
  chromaProcess.on('close', (code) => {
    console.log(`❌ [${sessionId}] MCP process exited with code ${code}`);
    res.write(`event: close\n`);
    res.write(`data: ${JSON.stringify({ code, timestamp: new Date().toISOString() })}\n\n`);
    res.end();
    sessions.delete(sessionId);
  });

  chromaProcess.on('error', (error) => {
    console.error(`💥 [${sessionId}] MCP process error:`, error);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message, timestamp: new Date().toISOString() })}\n\n`);
    res.end();
    sessions.delete(sessionId);
  });

  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 [${sessionId}] Client disconnected`);
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
    return res.status(404).json({ 
      error: 'Session not found',
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  const session = sessions.get(sessionId);
  
  try {
    // Send message to the MCP process
    const messageStr = JSON.stringify(message) + '\n';
    session.process.stdin.write(messageStr);
    console.log(`📨 [${sessionId}] Message sent: ${messageStr.trim()}`);
    res.json({ 
      success: true, 
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`💥 [${sessionId}] Error sending message:`, error);
    res.status(500).json({ 
      error: 'Failed to send message', 
      details: error.message,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// List active sessions
app.get('/sessions', (req, res) => {
  const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
    sessionId,
    connected: session.connected,
    createdAt: session.createdAt,
    uptime: Math.round((Date.now() - new Date(session.createdAt).getTime()) / 1000)
  }));
  
  res.json({ 
    sessions: activeSessions,
    total: activeSessions.length,
    timestamp: new Date().toISOString()
  });
});

// Terminate a session
app.delete('/mcp/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessions.has(sessionId)) {
    return res.status(404).json({ 
      error: 'Session not found',
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  const session = sessions.get(sessionId);
  
  try {
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM');
    }
    sessions.delete(sessionId);
    console.log(`🗑️  [${sessionId}] Session terminated`);
    res.json({ 
      success: true, 
      message: 'Session terminated',
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`💥 [${sessionId}] Error terminating session:`, error);
    res.status(500).json({ 
      error: 'Failed to terminate session', 
      details: error.message,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// Cleanup endpoint (terminate all sessions)
app.post('/cleanup', (req, res) => {
  const sessionCount = sessions.size;
  console.log(`🧹 Cleaning up ${sessionCount} sessions...`);
  
  for (const [sessionId, session] of sessions) {
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM');
    }
  }
  
  sessions.clear();
  
  res.json({
    success: true,
    message: `Terminated ${sessionCount} sessions`,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(config.port, () => {
  console.log(`🌐 ChromaDB MCP HTTP/SSE Server listening on port ${config.port}`);
  console.log(`📊 Health check: http://localhost:${config.port}/health`);
  console.log(`🔌 SSE endpoint: http://localhost:${config.port}/mcp`);
  console.log(`📋 Sessions API: http://localhost:${config.port}/sessions`);
  console.log(`🏠 Web interface: http://localhost:${config.port}/`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  
  // Terminate all active sessions
  const sessionCount = sessions.size;
  for (const [sessionId, session] of sessions) {
    console.log(`🗑️  Terminating session: ${sessionId}`);
    if (session.process && !session.process.killed) {
      session.process.kill('SIGTERM');
    }
  }
  
  sessions.clear();
  console.log(`✅ Terminated ${sessionCount} sessions`);
  console.log('👋 Server shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
