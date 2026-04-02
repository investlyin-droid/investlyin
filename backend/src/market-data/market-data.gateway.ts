import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Injectable()
@WebSocketGateway({
  namespace: '/market-data',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MarketDataGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private subscribedSymbols: Map<string, Set<string>> = new Map(); // symbol -> Set of client IDs
  private priceUpdateInterval: NodeJS.Timeout | null = null;

  constructor(private marketDataService: MarketDataService) {}

  afterInit(server: Server) {
    // Server is now initialized, safe to start broadcasting (500ms for real-time positions P/L)
    this.priceUpdateInterval = setInterval(() => {
      this.broadcastPriceUpdates();
    }, 500);
  }

  handleConnection(client: Socket) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Market data client connected: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Market data client disconnected: ${client.id}`);
    }
    // Remove client from all subscriptions
    this.subscribedSymbols.forEach((clients, symbol) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.subscribedSymbols.delete(symbol);
      }
    });
  }

  @SubscribeMessage('subscribe:symbol')
  handleSubscribeToSymbol(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbol: string },
  ) {
    const { symbol } = data;
    if (!this.subscribedSymbols.has(symbol)) {
      this.subscribedSymbols.set(symbol, new Set());
    }
    this.subscribedSymbols.get(symbol)!.add(client.id);
    client.join(`symbol:${symbol}`);
    
    // Send current price immediately
    const price = this.marketDataService.getPrice(symbol);
    if (price) {
      client.emit('price:update', price);
    }

    return { event: 'subscribed', symbol };
  }

  @SubscribeMessage('unsubscribe:symbol')
  handleUnsubscribeFromSymbol(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbol: string },
  ) {
    const { symbol } = data;
    const clients = this.subscribedSymbols.get(symbol);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.subscribedSymbols.delete(symbol);
      }
    }
    client.leave(`symbol:${symbol}`);
    return { event: 'unsubscribed', symbol };
  }

  @SubscribeMessage('subscribe:all')
  async handleSubscribeToAll(@ConnectedSocket() client: Socket) {
    const allPrices = await this.marketDataService.getAllPrices();
    const allSymbols = allPrices.map(p => p.symbol);
    
    allSymbols.forEach(symbol => {
      if (!this.subscribedSymbols.has(symbol)) {
        this.subscribedSymbols.set(symbol, new Set());
      }
      this.subscribedSymbols.get(symbol)!.add(client.id);
      client.join(`symbol:${symbol}`);
    });
    
    client.emit('prices:update', allPrices);
    return { event: 'subscribed:all', symbols: allSymbols };
  }

  private async broadcastPriceUpdates() {
    if (!this.server) return;
    this.subscribedSymbols.forEach((clients, symbol) => {
      if (clients.size > 0) {
        const price = this.marketDataService.getPrice(symbol);
        if (price) this.server.to(`symbol:${symbol}`).emit('price:update', price);
      }
    });
    const allPrices = await this.marketDataService.getAllPrices();
    this.server.emit('prices:update', allPrices);
  }

  // Public method to broadcast price update (can be called from other services)
  broadcastPriceUpdate(symbol: string, price: any) {
    if (!this.server) {
      return;
    }
    this.server.to(`symbol:${symbol}`).emit('price:update', price);
  }

  // Public method to broadcast all prices
  async broadcastAllPrices() {
    if (!this.server) return;
    const allPrices = await this.marketDataService.getAllPrices();
    this.server.emit('prices:update', allPrices);
  }

  // Cleanup on destroy
  onModuleDestroy() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }
}
