import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

const ADMIN_TRADES_ROOM = 'admin:trades';

/** When `notifyUser` is false, only the admin dealer room receives the event (admin-initiated trade changes). */
export type TradeSocketNotifyOptions = { notifyUser?: boolean };

type WsUser = { sub: string; role: string; email?: string };

/**
 * JWT required on every connection (auth.token). User rooms use JWT `sub` only.
 * Admin `subscribe:all-trades` requires admin/super_admin role + same allowlist as HTTP AdminAllowlistGuard.
 * CORS: origin reflected from the request (Socket.IO `origin: true`); auth is the real gate.
 */
@WebSocketGateway({
  namespace: '/trades',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TradeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'secretKey';
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    let t = typeof auth?.token === 'string' ? auth.token.trim() : '';
    if (!t) {
      const h = client.handshake.headers.authorization;
      if (typeof h === 'string' && h.startsWith('Bearer ')) {
        t = h.slice(7).trim();
      }
    }
    return t || null;
  }

  private verifyJwt(token: string): WsUser | null {
    try {
      const payload = this.jwtService.verify<{ sub: string; role?: string; email?: string }>(token, {
        secret: this.jwtSecret(),
      });
      if (!payload?.sub) return null;
      return {
        sub: payload.sub,
        role: String(payload.role || 'user'),
        email: payload.email,
      };
    } catch {
      return null;
    }
  }

  private isAdminRole(role: string): boolean {
    const r = role.toLowerCase();
    return r === 'admin' || r === 'super_admin';
  }

  /** Mirrors AdminAllowlistGuard */
  private isEmailAllowedForAdmin(email: string | undefined): boolean {
    const allowed =
      this.configService.get<string>('ADMIN_ALLOWED_EMAILS')?.trim() ||
      this.configService.get<string>('ADMIN_EMAIL')?.trim();
    if (!allowed) return true;
    const list = allowed.split(',').map((e) => e.trim().toLowerCase());
    return list.includes((email || '').toLowerCase());
  }

  private canSubscribeAllTrades(wsUser: WsUser): boolean {
    if (!this.isAdminRole(wsUser.role)) return false;
    return this.isEmailAllowedForAdmin(wsUser.email);
  }

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    const wsUser = this.verifyJwt(token);
    if (!wsUser) {
      client.disconnect(true);
      return;
    }
    (client.data as { wsUser?: WsUser }).wsUser = wsUser;
  }

  handleDisconnect(_client: Socket) {
    // room membership cleared by socket.io
  }

  private getWsUser(client: Socket): WsUser | undefined {
    return (client.data as { wsUser?: WsUser }).wsUser;
  }

  @SubscribeMessage('subscribe:trades')
  handleSubscribeTrades(client: Socket, _payload: { userId?: string }): { event: string; ok: boolean; error?: string } {
    const wsUser = this.getWsUser(client);
    if (!wsUser) {
      return { event: 'subscribed', ok: false, error: 'Unauthorized' };
    }
    client.join(`user:${wsUser.sub}`);
    return { event: 'subscribed', ok: true };
  }

  @SubscribeMessage('unsubscribe:trades')
  handleUnsubscribeTrades(client: Socket): void {
    const wsUser = this.getWsUser(client);
    if (wsUser) {
      client.leave(`user:${wsUser.sub}`);
    }
  }

  @SubscribeMessage('subscribe:all-trades')
  handleSubscribeAllTrades(client: Socket): { event: string; ok: boolean; error?: string } {
    const wsUser = this.getWsUser(client);
    if (!wsUser || !this.canSubscribeAllTrades(wsUser)) {
      return { event: 'subscribed', ok: false, error: 'Forbidden' };
    }
    client.join(ADMIN_TRADES_ROOM);
    return { event: 'subscribed', ok: true };
  }

  @SubscribeMessage('unsubscribe:all-trades')
  handleUnsubscribeAllTrades(client: Socket): void {
    client.leave(ADMIN_TRADES_ROOM);
  }

  @SubscribeMessage('subscribeToSymbol')
  handleSubscribeToSymbol(client: Socket, symbol: string) {
    const wsUser = this.getWsUser(client);
    if (!wsUser) {
      return { event: 'error', data: 'Unauthorized' };
    }
    return { event: 'subscribed', data: symbol };
  }

  emitTradeOpened(userId: string, userPayload: any, adminPayload?: any, opts?: TradeSocketNotifyOptions) {
    if (opts?.notifyUser !== false && userPayload != null) {
      this.server.to(`user:${userId}`).emit('tradeOpened', userPayload);
    }
    this.server.to(ADMIN_TRADES_ROOM).emit('trade:opened', adminPayload ?? userPayload);
  }

  emitTradeClosed(userId: string, userPayload: any, adminPayload?: any, opts?: TradeSocketNotifyOptions) {
    if (opts?.notifyUser !== false && userPayload != null) {
      this.server.to(`user:${userId}`).emit('tradeClosed', userPayload);
    }
    this.server.to(ADMIN_TRADES_ROOM).emit('trade:closed', adminPayload ?? userPayload);
  }

  emitTradeUpdated(userId: string, userPayload: any, adminPayload?: any, opts?: TradeSocketNotifyOptions) {
    if (opts?.notifyUser !== false && userPayload != null) {
      this.server.to(`user:${userId}`).emit('tradeUpdated', userPayload);
    }
    this.server.to(ADMIN_TRADES_ROOM).emit('trade:updated', adminPayload ?? userPayload);
  }

  emitTradeDeleted(userId: string, tradeId: string, opts?: TradeSocketNotifyOptions) {
    if (opts?.notifyUser !== false) {
      this.server.to(`user:${userId}`).emit('tradeDeleted', { tradeId });
    }
    this.server.to(ADMIN_TRADES_ROOM).emit('trade:deleted', { tradeId, userId });
  }

  emitBalanceUpdated(userId: string, data: { balance: number; currency: string }, opts?: TradeSocketNotifyOptions) {
    if (opts?.notifyUser !== false) {
      this.server.to(`user:${userId}`).emit('balanceUpdated', data);
    }
  }
}
