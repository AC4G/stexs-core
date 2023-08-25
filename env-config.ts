import { config } from "dotenv";

config();

export const NODE_ENV: string = process.env.NODE_ENV!;
export const SERVER_PORT: number = parseInt(process.env.SERVER_PORT!);
export const PG_URL: string = process.env.PG_URL!;
export const SMTP_HOST: string = process.env.SMTP_HOST!;
export const SMTP_PORT: number = parseInt(process.env.SMTP_PORT!);
export const SMTP_USER: string = process.env.SMTP_USER!;
export const SMTP_PWD: string = process.env.SMTP_PWD!;
export const SMTP_EMAIL: string = process.env.SMTP_EMAIL!;
export const ACCESS_TOKEN_SECRET: string = process.env.ACCESS_TOKEN_SECRET!;
export const REFRESH_TOKEN_SECRET: string = process.env.REFRESH_TOKEN_SECRET!;
export const ISSUER: string = process.env.ISSUER!;
export const AUDIENCE: string = process.env.AUDIENCE!;
export const JWT_EXPIRY_LIMIT: number = parseInt(process.env.JWT_EXPIRY_LIMIT!);
export const REDIRECT_TO_SIGN_IN: string = process.env.REDIRECT_TO_SIGN_IN!;
export const REDIRECT_TO_EMAIL_CHANGE: string = process.env.REDIRECT_TO_EMAIL_CHANGE!;
