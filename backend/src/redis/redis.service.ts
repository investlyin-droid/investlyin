import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private enabled: boolean = true;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT') ?? 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    if (!host) {
      this.enabled = false;
      this.logger.warn('Redis not configured (REDIS_HOST missing). Caching disabled.');
      return;
    }
    try {
      this.client = new Redis({
        host,
        port: Number(port),
        ...(password && { password }),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => (times <= 3 ? Math.min(times * 500, 2000) : null),
      });
      this.client.on('error', (err) => this.logger.warn('Redis error:', err?.message));
      this.client.on('connect', () => this.logger.log('Redis connected'));
    } catch (err: any) {
      this.logger.warn('Redis init failed:', err?.message);
      this.enabled = false;
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.client = null;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isEnabled(): boolean {
    return this.enabled && this.client != null;
  }

  /** Ping Redis for health checks. Returns true if connected. */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  /** Get cached JSON value. Returns null on miss or error. */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Set key with JSON value and optional TTL in seconds. */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds != null && ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      // ignore
    }
  }

  /** Delete a key. */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }

  /** Delete keys by pattern (e.g. "wallet:*"). Use sparingly. */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      // ignore
    }
  }
}
