import { config } from 'dotenv';

config();

export const ENV: string = process.env.ENV!;
export const SERVER_PORT: number = parseInt(process.env.STORAGE_SERVER_PORT!);
export const LOGGER_URL: string = process.env.LOGGER_URL!;
export const STORAGE_ENDPOINT: string = process.env.STORAGE_ENDPOINT!;
export const S3_AVATARS_ACCESS_KEY: string = process.env.S3_AVATARS_ACCESS_KEY!;
export const S3_AVATARS_SECRET_KEY: string = process.env.S3_AVATARS_SECRET_KEY!;
export const S3_ITEMS_ACCESS_KEY: string = process.env.S3_ITEMS_ACCESS_KEY!;
export const S3_ITEMS_SECRET_KEY: string = process.env.S3_ITEMS_SECRET_KEY!;
export const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET!;
export const AUDIENCE: string = process.env.AUDIENCE!;
export const ISSUER: string = process.env.ISSUER!;
export const PG_URL: string = process.env.PG_URL!;
