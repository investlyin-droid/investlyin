'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketIoUrl } from '@/lib/socket';

interface UseTradeSocketOptions {
  userId: string | undefined;
  /** JWT access_token — required for /trades namespace */
  token: string | undefined;
  onTradeOpened?: (trade: any) => void;
  onTradeClosed?: (trade: any) => void;
  onTradeUpdated?: (trade: any) => void;
  onTradeDeleted?: (payload: { tradeId: string }) => void;
  onBalanceUpdated?: (data: { balance: number; currency: string }) => void;
}

export function useTradeSocket({
  userId,
  token,
  onTradeOpened,
  onTradeClosed,
  onTradeUpdated,
  onTradeDeleted,
  onBalanceUpdated,
}: UseTradeSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({ onTradeOpened, onTradeClosed, onTradeUpdated, onTradeDeleted, onBalanceUpdated });
  callbacksRef.current = { onTradeOpened, onTradeClosed, onTradeUpdated, onTradeDeleted, onBalanceUpdated };

  useEffect(() => {
    if (!userId || !token) return;

    const baseUrl = getSocketIoUrl();
    const socket = io(`${baseUrl}/trades`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:trades', { userId });
    });

    socket.on('tradeOpened', (trade: any) => {
      callbacksRef.current.onTradeOpened?.(trade);
    });

    socket.on('tradeClosed', (trade: any) => {
      callbacksRef.current.onTradeClosed?.(trade);
    });

    socket.on('tradeUpdated', (trade: any) => {
      callbacksRef.current.onTradeUpdated?.(trade);
    });

    socket.on('tradeDeleted', (payload: { tradeId: string }) => {
      callbacksRef.current.onTradeDeleted?.(payload);
    });

    socket.on('balanceUpdated', (data: { balance: number; currency: string }) => {
      callbacksRef.current.onBalanceUpdated?.(data);
    });

    return () => {
      const s = socket;
      socketRef.current = null;
      s.emit('unsubscribe:trades', { userId });
      if (s.connected) {
        s.disconnect();
      } else {
        s.once('connect', () => s.disconnect());
      }
    };
  }, [userId, token]);

  return { socket: socketRef.current };
}
