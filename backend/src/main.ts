import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import { Logger } from "nestjs-pino";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const isProd = process.env.NODE_ENV === "production";

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  app.use(cookieParser());
  app.use(json({ limit: "8mb" }));
  app.use(urlencoded({ extended: true, limit: "8mb" }));

  const allowed = new Set(parseCorsOrigins(process.env.CORS_ORIGINS));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman/curl
      if (allowed.size === 0) return callback(null, true); // dev fallback if unset
      if (allowed.has(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          e.constraints ? Object.values(e.constraints) : [],
        );
        return new BadRequestException(
          messages.length ? messages : "Invalid request.",
        );
      },
    }),
  );

  app.useGlobalFilters(app.get(AllExceptionsFilter));

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, "0.0.0.0");

  const server: any = app.getHttpServer();
  const router = server._events?.request?._router;
  const routes = router?.stack
    ?.filter((l: any) => l.route)
    ?.map((l: any) => ({
      path: l.route.path,
      methods: l.route.methods,
    }));

  console.log(routes);
}

bootstrap();
