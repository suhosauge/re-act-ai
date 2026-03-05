import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WsClient {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients: Map<string, WsClient> = new Map();
let clientIdCounter = 0;

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const clientId = `client-${++clientIdCounter}`;
    clients.set(clientId, { ws, subscriptions: new Set() });
    console.log(`[WS] Client connected: ${clientId}`);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(clientId, msg);
      } catch {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error for ${clientId}:`, err.message);
      clients.delete(clientId);
    });

    // Send welcome
    ws.send(JSON.stringify({ type: 'connected', clientId }));
  });

  console.log('[WS] WebSocket server ready on /ws');
}

function handleMessage(clientId: string, msg: { type: string; jobId?: string }): void {
  const client = clients.get(clientId);
  if (!client) return;

  switch (msg.type) {
    case 'subscribe':
      if (msg.jobId) {
        client.subscriptions.add(msg.jobId);
        client.ws.send(JSON.stringify({ type: 'subscribed', jobId: msg.jobId }));
      }
      break;

    case 'unsubscribe':
      if (msg.jobId) {
        client.subscriptions.delete(msg.jobId);
        client.ws.send(JSON.stringify({ type: 'unsubscribed', jobId: msg.jobId }));
      }
      break;

    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

// Broadcast metric update to subscribed clients
export function broadcastMetric(jobId: string, metric: Record<string, unknown>): void {
  for (const [, client] of clients) {
    if (client.subscriptions.has(jobId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'metric',
        jobId,
        data: metric,
      }));
    }
  }
}

// Broadcast status change
export function broadcastStatusChange(jobId: string, status: string): void {
  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'status_change',
        jobId,
        status,
      }));
    }
  }
}
