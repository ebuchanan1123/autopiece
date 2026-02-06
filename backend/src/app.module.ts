import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { OrdersModule } from './orders/orders.module';
import { APP_FILTER } from '@nestjs/core';


import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { AuthModule } from './auth/auth.module';
import { ListingModule } from './listings/listing.module';


import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ListingModule,
    OrdersModule,
    ConfigModule.forRoot({ isGlobal: true }),

    LoggerModule.forRoot({
      pinoHttp: {
        level:
          process.env.LOG_LEVEL ??
          (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.refreshToken',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';

        const sslEnabled =
          (config.get<string>('DB_SSL') ?? '').toLowerCase() === 'true' ||
          nodeEnv === 'production';

        const common = {
          autoLoadEntities: true,
          synchronize: false,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        };

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            ...common,
          };
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST') ?? 'localhost',
          port: Number(config.get<string>('DB_PORT') ?? 5432),
          username: config.get<string>('DB_USER') ?? 'postgres',
          password: config.get<string>('DB_PASSWORD') ?? 'password',
          database: config.get<string>('DB_NAME') ?? 'autoparts',
          ...common,
        };
      },
    }),

    UsersModule,
    SellersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AllExceptionsFilter,   
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
