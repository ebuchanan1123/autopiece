"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const config_1 = require("@nestjs/config");
const nestjs_pino_1 = require("nestjs-pino");
const orders_module_1 = require("./orders/orders.module");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const users_module_1 = require("./users/users.module");
const sellers_module_1 = require("./sellers/sellers.module");
const auth_module_1 = require("./auth/auth.module");
const listing_module_1 = require("./listings/listing.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            listing_module_1.ListingModule,
            orders_module_1.OrdersModule,
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            nestjs_pino_1.LoggerModule.forRoot({
                pinoHttp: {
                    level: process.env.LOG_LEVEL ??
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
                    genReqId: (req) => req.headers['x-request-id'] ||
                        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                },
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60_000,
                    limit: 60,
                },
            ]),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const databaseUrl = config.get('DATABASE_URL');
                    const nodeEnv = config.get('NODE_ENV') ?? 'development';
                    const sslEnabled = (config.get('DB_SSL') ?? '').toLowerCase() === 'true' ||
                        nodeEnv === 'production';
                    const common = {
                        autoLoadEntities: true,
                        synchronize: false,
                        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
                    };
                    if (databaseUrl) {
                        return {
                            type: 'postgres',
                            url: databaseUrl,
                            ...common,
                        };
                    }
                    return {
                        type: 'postgres',
                        host: config.get('DB_HOST') ?? 'localhost',
                        port: Number(config.get('DB_PORT') ?? 5432),
                        username: config.get('DB_USER') ?? 'postgres',
                        password: config.get('DB_PASSWORD') ?? 'password',
                        database: config.get('DB_NAME') ?? 'autoparts',
                        ...common,
                    };
                },
            }),
            users_module_1.UsersModule,
            sellers_module_1.SellersModule,
            auth_module_1.AuthModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, all_exceptions_filter_1.AllExceptionsFilter,
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map