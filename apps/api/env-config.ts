import { config } from 'dotenv';
import logger from './src/logger';
import { z } from 'zod';

config();

const missingEnvVars: string[] = [];

const checkEnvVarExists = (varName: string) => {
	if (!(varName in process.env)) {
		logger.error(`Missing environment variable: ${varName}. Please define it in your .env file.`);
		missingEnvVars.push(varName);
	}
};

const withDefaultString = (schema: z.ZodString, defaultValue: string | undefined, varName: string) => {
	checkEnvVarExists(varName);
	const newSchema = schema.transform(value => {
		if (value.trim() === '') {
		  logger.warn(`${varName} is empty or invalid. Applying default value: "${defaultValue}"`);
		  return defaultValue;
		}
		return value;
	  });

	if (defaultValue === undefined) return newSchema;

	return newSchema.default(defaultValue);
}

const withDefaultNumber = (schema: z.ZodNumber, defaultValue: number, varName: string) => {
	checkEnvVarExists(varName);
	return schema.transform(value => {
	  if (value === undefined || value === null || value === 0) {
		logger.warn(`${varName} is empty or invalid. Applying default value: "${defaultValue}"`);
		return defaultValue;
	  }
	  return value;
	}).default(defaultValue);
}

const envSchema = z.object({
	// Strings
	ENV: withDefaultString(z.string(), 'dev', 'ENV'),
	SERVICE_NAME: withDefaultString(z.string(), 'STEXS', 'SERVICE_NAME'),
	SMTP_HOST: withDefaultString(z.string(), 'localhost', 'SMTP_HOST'),
	SMTP_USER: withDefaultString(z.string(), 'admin', 'SMTP_USER'),
	SMTP_EMAIL: withDefaultString(z.string().email(), 'service@example.com', 'SMTP_EMAIL'),
	STEXS_DB_HOST: withDefaultString(z.string(), 'localhost', 'STEXS_DB_HOST'),
	STEXS_DB_USER: withDefaultString(z.string(), 'postgres', 'STEXS_DB_USER'),
	STEXS_DB_NAME: withDefaultString(z.string(), 'postgres', 'STEXS_DB_NAME'),
	STORAGE_PROTOCOL: withDefaultString(z.string(), 'http', 'STORAGE_PROTOCOL'),
	STORAGE_HOST: withDefaultString(z.string(), 'localhost', 'STORAGE_HOST'),
	STORAGE_BUCKET: withDefaultString(z.string(), 'stexs', 'STORAGE_BUCKET'),
	TOTP_ALGORITHM: withDefaultString(z.string(), 'SHA256', 'TOTP_ALGORITHM'),
	
	// Numbers
	STEXS_API_PORT: withDefaultNumber(z.coerce.number(), 3001, 'STEXS_API_PORT'),
	SMTP_PORT: withDefaultNumber(z.coerce.number(), 1025, 'SMTP_PORT'),
	STEXS_DB_PORT: withDefaultNumber(z.coerce.number(), 5431, 'STEXS_DB_PORT'),
	TEST_DB_PORT: withDefaultNumber(z.coerce.number(), 5555, 'TEST_DB_PORT'),
	TOTP_DIGITS: withDefaultNumber(z.coerce.number(), 6, 'TOTP_DIGITS'),
	TOTP_PERIOD: withDefaultNumber(z.coerce.number(), 30, 'TOTP_PERIOD'),
	JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT: withDefaultNumber(z.coerce.number(), 600, 'JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT'),
	JWT_EXPIRY_LIMIT: withDefaultNumber(z.coerce.number(), 3600, 'JWT_EXPIRY_LIMIT'),
	JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT: withDefaultNumber(z.coerce.number(), 900, 'JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT'),
	STORAGE_PORT: withDefaultNumber(z.coerce.number(), 9001, 'STORAGE_PORT'),
	
	// Passwords (required, must be explicitly set)
	STEXS_DB_PWD: z.string().min(1, 'STEXS_DB_PWD is required'),
	SMTP_PWD: z.string().min(1, 'SMTP_PWD is required'),
	
	// Secure strings (required)
	ACCESS_TOKEN_SECRET: z.string().min(1, 'ACCESS_TOKEN_SECRET is required'),
	REFRESH_TOKEN_SECRET: z.string().min(1, 'REFRESH_TOKEN_SECRET is required'),
	SIGN_IN_CONFIRM_TOKEN_SECRET: z.string().min(1, 'SIGN_IN_CONFIRM_TOKEN_SECRET is required'),
	STORAGE_ACCESS_KEY: z.string().min(1, 'STORAGE_ACCESS_KEY is required'),
	STORAGE_SECRET_KEY: z.string().min(1, 'STORAGE_SECRET_KEY is required'),
	LAGO_API_KEY: z.string().min(1, 'LAGO_API_KEY is required'),
	
	// URLs
	ISSUER: withDefaultString(z.string().url(), 'http://localhost:3001', 'ISSUER'),
	AUDIENCE: withDefaultString(z.string().url(), 'http://localhost:3000', 'AUDIENCE'),
	SIGN_IN_URL: withDefaultString(z.string().url(), 'http://localhost:5172/sign-in', 'SIGN_IN_URL'),
	RECOVERY_URL: withDefaultString(z.string().url(), 'http://localhost:5172/recovery', 'RECOVERY_URL'),
	LOGGER_URL: withDefaultString(z.string().url(), undefined, 'LOGGER_URL'),
});

[
	'STEXS_DB_PWD',
	'SMTP_PWD',
	'ACCESS_TOKEN_SECRET',
	'REFRESH_TOKEN_SECRET',
	'SIGN_IN_CONFIRM_TOKEN_SECRET',
	'STORAGE_ACCESS_KEY',
	'STORAGE_SECRET_KEY',
	'LAGO_API_KEY',
].forEach(checkEnvVarExists);

if (missingEnvVars.length > 0) {
	process.exit(1);
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
	logger.error('Invalid environment variables:', parsedEnv.error);
	process.exit(1);
}

const env = parsedEnv.data;

export const ENV = env.ENV!;
export const SERVER_PORT = env.STEXS_API_PORT;

export const POSTGRES_HOST = env.STEXS_DB_HOST!;
export const POSTGRES_PORT = env.STEXS_DB_PORT;
export const POSTGRES_USER = env.STEXS_DB_USER!;
export const POSTGRES_PWD = env.STEXS_DB_PWD;
export const POSTGRES_DB = env.STEXS_DB_NAME!;
export const TEST_DB_PORT = env.TEST_DB_PORT;

export const SMTP_HOST = env.SMTP_HOST!;
export const SMTP_PORT = env.SMTP_PORT;
export const SMTP_USER = env.SMTP_USER!;
export const SMTP_PWD = env.SMTP_PWD;
export const SMTP_EMAIL = env.SMTP_EMAIL!;

export const ACCESS_TOKEN_SECRET = env.ACCESS_TOKEN_SECRET;
export const REFRESH_TOKEN_SECRET = env.REFRESH_TOKEN_SECRET;
export const SIGN_IN_CONFIRM_TOKEN_SECRET = env.SIGN_IN_CONFIRM_TOKEN_SECRET;

export const ISSUER = env.ISSUER!;
export const AUDIENCE = env.AUDIENCE!;
export const JWT_EXPIRY_LIMIT = env.JWT_EXPIRY_LIMIT;
export const JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT = env.JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT;
export const JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT = env.JWT_EXPIRY_SIGN_IN_CONFIRM_LIMIT;

export const REDIRECT_TO_SIGN_IN = env.SIGN_IN_URL!;
export const REDIRECT_TO_RECOVERY = env.RECOVERY_URL!;

export const LOGGER_URL = env.LOGGER_URL;

export const SERVICE_NAME = env.SERVICE_NAME!;

export const TOTP_ALGORITHM = env.TOTP_ALGORITHM!;
export const TOTP_DIGITS = env.TOTP_DIGITS;
export const TOTP_PERIOD = env.TOTP_PERIOD;

export const STORAGE_PROTOCOL = env.STORAGE_PROTOCOL!;
export const STORAGE_PORT = env.STORAGE_PORT;
export const STORAGE_HOST = env.STORAGE_HOST!;
export const STORAGE_ACCESS_KEY = env.STORAGE_ACCESS_KEY;
export const STORAGE_SECRET_KEY = env.STORAGE_SECRET_KEY;
export const BUCKET = env.STORAGE_BUCKET!;

export const LAGO_API_KEY = env.LAGO_API_KEY;
