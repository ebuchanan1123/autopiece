import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { loadEnv } from './config/env';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const env = loadEnv();

const databaseUrl =
  env.DATABASE_URL ??
  `postgres://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: env.DB_SSL  ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
