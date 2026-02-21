'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketIoUrl } from '@/lib/socket';

export interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  sourceTimestamp?: number;
  dataQuality?: 'real' | 'stale';
}

export function useMarketSocket() {
  const [prices, setPrices] = useState<PriceUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const refetchPrices = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('subscribe:all');
    }
  }, []);

  useEffect(() => {
    const baseUrl = getSocketIoUrl();
    const socket = io(`${baseUrl}/market-data`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:all');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('prices:update', (data: PriceUpdate[]) => {
      setPrices(Array.isArray(data) ? data : []);
    });

    socket.on('price:update', (data: PriceUpdate) => {
      setPrices((prev) => {
        const next = prev.filter((p) => p.symbol !== data.symbol);
        next.push(data);
        return next;
      });
    });

    return () => {
      const s = socket;
      socketRef.current = null;
      s.emit('unsubscribe:symbol', { symbol: '*' });
      // Defer disconnect to avoid "closed before connection established" in React Strict Mode
      if (s.connected) {
        s.disconnect();
      } else {
        s.once('connect', () => s.disconnect());
      }
    };
  }, []);

  return { prices, isConnected, refetchPrices };
}
