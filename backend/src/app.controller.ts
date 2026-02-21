import { Controller, Get, Optional } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './redis/redis.service';
import { FirebaseService } from './auth/firebase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private connection: Connection,
    @Optional() private redis: RedisService,
    @Optional() private firebase: FirebaseService,
  ) {}

  @Get()
  getHello() {
    return {
      message: this.appService.getHello(),
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  async getHealth() {
    const health: Record<string, unknown> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'unknown',
        redis: 'unavailable',
        firebase: 'unavailable',
        memory: {
          used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          unit: 'MB',
        },
      } as Record<string, unknown>,
    };

    const services = health.services as Record<string, unknown>;

    try {
      const dbState = this.connection.readyState;
      services.database = dbState === 1 ? 'connected' : 'disconnected';
      if (dbState !== 1) (health.status as string) = 'degraded';
    } catch {
      services.database = 'error';
      health.status = 'degraded';
    }

    if (this.redis?.isEnabled()) {
      try {
        services.redis = (await this.redis.ping()) ? 'connected' : 'disconnected';
      } catch {
        services.redis = 'error';
      }
    } else {
      services.redis = 'not_configured';
    }

    if (this.firebase) {
      services.firebase = this.firebase.isInitialized() ? 'initialized' : 'not_configured';
    }

    return health;
  }
}
