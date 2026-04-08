import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';

function initSentryIfConfigured() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
  } catch {
    // @sentry/node not installed; skip
  }
}

initSentryIfConfigured();

function validateProductionEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;
  const warnings: string[] = [];
  if (!process.env.ALLOWED_ORIGINS?.trim()) {
    warnings.push('ALLOWED_ORIGINS is not set. CORS will block browser requests. Set it to your frontend URL(s).');
  }
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'your-super-secret-jwt-key-change-this-in-production' || jwtSecret === 'secretKey') {
    warnings.push('JWT_SECRET is missing or still the default. Use a strong random value (e.g. openssl rand -base64 32).');
  }
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri || mongoUri.includes('localhost:27017')) {
    warnings.push('MONGO_URI is missing or points to localhost. Use a production MongoDB connection string.');
  }
  const hasFirebase = !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  if (!hasFirebase) {
    warnings.push('Firebase is not configured (no FIREBASE_SERVICE_ACCOUNT_PATH/JSON). Login and admin features will fail.');
  }
  if (!process.env.REDIS_URL?.trim() && !process.env.REDIS_HOST?.trim()) {
    warnings.push('Redis is not configured (REDIS_URL or REDIS_HOST). Session/rate-limiting may use in-memory fallback.');
  }
  warnings.forEach((w) => console.warn('⚠ Production env:', w));
}

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create(AppModule);

  // Increase body size limits for large image uploads (KYC)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Gzip compression for faster responses (apply before other middleware)
  app.use(compression());

  // Security Headers with Helmet (v5+ default export)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://s3.tradingview.com', 'https://www.tradingview.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'https://s3-symbol-logo.tradingview.com', 'https://www.tradingview.com'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'https://*.tradingview.com'],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'", 'https://www.tradingview.com', 'https://s.tradingview.com'],
        },
      },

      crossOriginEmbedderPolicy: false, // Allow WebSocket connections
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const uploadBase = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  app.use('/uploads', express.static(uploadBase));
  const uploadDirs = [
    join(uploadBase, 'kyc-documents'),
    join(uploadBase, 'payment-screenshots'),
  ];
  for (const dir of uploadDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err: any) {
      console.error(`Failed to create upload directory ${dir}:`, err?.message || err);
      throw new Error(`Upload directory not writable: ${dir}. Set UPLOAD_DIR in .env to a writable path.`);
    }
  }

  // CORS Configuration - Production ready
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOriginsRaw = process.env.ALLOWED_ORIGINS?.trim();
  let allowedOrigins: string[];
  if (allowedOriginsRaw) {
    allowedOrigins = allowedOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);
  } else if (isProduction) {
    console.warn(
      'CORS: ALLOWED_ORIGINS is not set in production. Requests from browsers may be blocked. Set ALLOWED_ORIGINS in .env (e.g. https://yourdomain.com).',
    );
    allowedOrigins = [];
  } else {
    allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'bypass-tunnel-reminder',
      'X-Requested-With',
    ],
    exposedHeaders: ['bypass-tunnel-reminder'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    maxAge: 86400, // 24 hours
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Process error handlers for production stability
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.SENTRY_DSN?.trim()) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.captureException(reason);
      } catch {
        // ignore
      }
    }
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    if (process.env.SENTRY_DSN?.trim()) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.captureException(error);
      } catch {
        // ignore
      }
    }
    process.exit(1);
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    console.log(`Backend listening on port ${port} (production)`);
  } else {
    console.log(`🚀 Backend server running on http://localhost:${port}`);
    console.log(`📊 Health check available at http://localhost:${port}/health`);
    console.log(`🌍 Environment: ${env}`);
  }
}
bootstrap();
