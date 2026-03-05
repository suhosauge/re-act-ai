'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

interface WsMessage {
  type: string;
  jobId?: string;
  data?: any;
  status?: string;
  clientId?: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Map<string, Set<(msg: WsMessage) => void>>>(new Map());

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        wsRef.current = ws;
      };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          // Notify all listeners for this message type
          const typeListeners = listenersRef.current.get(msg.type);
          if (typeListeners) {
            typeListeners.forEach((fn) => fn(msg));
          }
          // Also notify wildcard listeners
          const allListeners = listenersRef.current.get('*');
          if (allListeners) {
            allListeners.forEach((fn) => fn(msg));
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const subscribe = useCallback((jobId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', jobId }));
    }
  }, []);

  const unsubscribe = useCallback((jobId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', jobId }));
    }
  }, []);

  const onMessage = useCallback((type: string, callback: (msg: WsMessage) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(callback);

    return () => {
      listenersRef.current.get(type)?.delete(callback);
    };
  }, []);

  return { connected, subscribe, unsubscribe, onMessage };
}
