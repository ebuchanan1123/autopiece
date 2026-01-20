import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // What this does:
  // - Makes Nest (and your app logs) use structured JSON logs via pino.
  // Why it matters:
  // - Production log aggregation/searching becomes easy and reliable.
  app.useLogger(app.get(Logger));

  const isProd = process.env.NODE_ENV === 'production';

  // What this does:
  // - Adds security headers (Helmet).
  // Why it matters:
  // - Reduces common web attack surface.
  //
  // HSTS is production-only:
  // - In dev, enabling HSTS can cause annoying browser caching/HTTPS forcing on localhost.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProd
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
          }
        : false,
    }),
  );

  // What this does:
  // - Parses cookies so refresh token cookie is readable on req.cookies.
  // Why it matters:
  // - Your refresh token flow depends on HttpOnly cookies.
  app.use(cookieParser());

  // What this does:
  // - Strict CORS allowlist (only known frontends can use credentials).
  // Why it matters:
  // - Prevents random origins from making authenticated browser requests.
  const allowed = new Set(parseCorsOrigins(process.env.CORS_ORIGINS));
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl/postman/no Origin
      if (allowed.has(origin)) return callback(null, true);
      return callback(null, false); // blocked -> browser blocks (no CORS headers)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // What this does:
  // - Validates and transforms DTOs.
  // Why it matters:
  // - Blocks unexpected fields and malformed inputs early.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // What this does:
  // - Ensures errors become safe responses, while logs keep full detail.
  // Why it matters:
  // - No secret leakage, consistent error format, better debugging.
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
