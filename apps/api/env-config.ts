import { config } from 'dotenv';

config();

export const ENV: string = process.env.ENV!;
export const SERVER_PORT: number = parseInt(process.env.API_PORT!);

export const POSTGRES_HOST: string = process.env.STEXS_DB_HOST!;
export const POSTGRES_PORT: number = parseInt(process.env.STEXS_DB_PORT!);
export const POSTGRES_USER: string = process.env.STEXS_DB_USER!;
export const POSTGRES_PWD: string = process.env.STEXS_DB_PWD!;
export const POSTGRES_DB: string = process.env.STEXS_DB_NAME!;
export const TEST_DB_PORT: number = parseInt(process.env.TEST_DB_PORT!);

export const SMTP_HOST: string = process.env.SMTP_HOST!;
export const SMTP_PORT: number = parseInt(process.env.SMTP_PORT!);
export const SMTP_USER: string = process.env.SMTP_USER!;
export const SMTP_PWD: string = process.env.SMTP_PWD!;
export const SMTP_EMAIL: string = process.env.SMTP_EMAIL!;

export const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET!;
export const REFRESH_TOKEN_SECRET: string = process.env.REFRESH_TOKEN_SECRET!;
export const SIGN_IN_CONFIRM_TOKEN_SECRET: string =
	process.env.SIGN_IN_CONFIRM_TOKEN_SECRET!;

export const ISSUER: string = process.env.ISSUER!;
export const AUDIENCE: string = process.env.AUDIENCE!;
export const JWT_EXPIRY_LIMIT: number = parseInt(process.env.JWT_EXPIRY_LIMIT!);
export const JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT: number = parseInt(
	process.env.JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT!,
);
export const JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT: number = parseInt(
	process.env.JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT!,
);

export const REDIRECT_TO_SIGN_IN: string = process.env.SIGN_IN_URL!;
export const REDIRECT_TO_RECOVERY: string = process.env.RECOVERY_URL!;

export const LOGGER_URL: string = process.env.LOGGER_URL!;

export const SERVICE_NAME: string = process.env.SERVICE_NAME!;

export const TOTP_ALGORITHM: string = process.env.TOTP_ALGORITHM!;
export const TOTP_DIGITS: number = parseInt(process.env.TOTP_DIGITS!);
export const TOTP_PERIOD: number = parseInt(process.env.TOTP_PERIOD!);

export const STORAGE_PROTOCOL: string = process.env.STORAGE_PROTOCOL!;
export const STORAGE_PORT: number = parseInt(process.env.STORAGE_PORT!);
export const STORAGE_HOST: string = process.env.STORAGE_HOST!;
export const STORAGE_ACCESS_KEY: string = process.env.STORAGE_ACCESS_KEY!;
export const STORAGE_SECRET_KEY: string = process.env.STORAGE_SECRET_KEY!;
export const BUCKET: string = process.env.STORAGE_BUCKET!;

export const REDIS_URL: string = process.env.REDIS_URL!;

export const LAGO_API_KEY: string = process.env.LAGO_API_KEY!;
