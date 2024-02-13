import { config } from 'dotenv';

config();

export const ENV: string = process.env.ENV!;
export const SERVER_PORT: number = parseInt(process.env.AUTH_SERVER_PORT!);
export const PG_URL: string = process.env.PG_URL!;
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
export const JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT: number = parseInt(process.env.JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT!)
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
