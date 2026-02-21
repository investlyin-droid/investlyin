import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/trades',
  cors: { origin: '*' },
})
export class TradeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client will join user room after sending subscribe:trades with userId
  }

  handleDisconnect(client: Socket) {
    // Room membership is cleared automatically
  }

  /** Client sends subscribe:trades with { userId } to receive trade and balance updates in real time */
  @SubscribeMessage('subscribe:trades')
  handleSubscribeTrades(client: Socket, payload: { userId?: string }): void {
    const userId = payload?.userId;
    if (userId && typeof userId === 'string') {
      client.join(`user:${userId}`);
    }
  }

  @SubscribeMessage('unsubscribe:trades')
  handleUnsubscribeTrades(client: Socket, payload: { userId?: string }): void {
    const userId = payload?.userId;
    if (userId && typeof userId === 'string') {
      client.leave(`user:${userId}`);
    }
  }

  @SubscribeMessage('subscribeToSymbol')
  handleSubscribeToSymbol(client: Socket, symbol: string) {
    client.join(symbol);
    return { event: 'subscribed', data: symbol };
  }

  emitTradeOpened(userId: string, trade: any) {
    this.server.to(`user:${userId}`).emit('tradeOpened', trade);
  }

  emitTradeClosed(userId: string, trade: any) {
    this.server.to(`user:${userId}`).emit('tradeClosed', trade);
  }

  emitTradeUpdated(userId: string, trade: any) {
    this.server.to(`user:${userId}`).emit('tradeUpdated', trade);
  }

  /** Notify user that a trade was deleted (e.g. by admin) so they can remove it from UI */
  emitTradeDeleted(userId: string, tradeId: string) {
    this.server.to(`user:${userId}`).emit('tradeDeleted', { tradeId });
  }

  emitBalanceUpdated(userId: string, data: { balance: number; currency: string }) {
    this.server.to(`user:${userId}`).emit('balanceUpdated', data);
  }
}
