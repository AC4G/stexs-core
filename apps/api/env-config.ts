import { config } from 'dotenv';
import logger from './src/logger';
import { z } from 'zod';
import { EnvValidator } from 'utils-node';

config();

const requiredVars = [
    'STEXS_DB_PWD',
	'ACCESS_TOKEN_SECRET',
	'REFRESH_TOKEN_SECRET',
	'MFA_CHALLENGE_TOKEN_SECRET',
	'STORAGE_ACCESS_KEY',
	'STORAGE_SECRET_KEY',
	'LAGO_API_KEY',
];

const envValidator: EnvValidator = new EnvValidator(logger);

requiredVars.forEach(envValidator.checkEnvVarExists.bind(envValidator));

const envSchema: any = z.object({
    // Strings
	ENV: envValidator.withDefaultString(z.string(), 'dev', 'ENV'),

	LOGGER: envValidator.withDefaultString(z.enum(['console', 'loki']), 'console', 'LOGGER'),
	LOG_LEVEL: envValidator.withDefaultString(z.string(), 'info', 'LOG_LEVEL'),

	SERVICE_NAME: envValidator.withDefaultString(z.string(), 'STEXS', 'SERVICE_NAME'),
	SMTP_HOST: envValidator.withDefaultString(z.string(), 'localhost', 'SMTP_HOST'),
	SMTP_USER: envValidator.withDefaultString(z.string(), 'admin', 'SMTP_USER'),
	SMTP_EMAIL: envValidator.withDefaultString(z.string().email(), 'service@example.com', 'SMTP_EMAIL'),
	STEXS_DB_HOST: envValidator.withDefaultString(z.string(), 'localhost', 'STEXS_DB_HOST'),
	STEXS_DB_USER: envValidator.withDefaultString(z.string(), 'postgres', 'STEXS_DB_USER'),
	STEXS_DB_NAME: envValidator.withDefaultString(z.string(), 'postgres', 'STEXS_DB_NAME'),
	STORAGE_PROTOCOL: envValidator.withDefaultString(z.string(), 'http', 'STORAGE_PROTOCOL'),
	STORAGE_HOST: envValidator.withDefaultString(z.string(), 'localhost', 'STORAGE_HOST'),
	STORAGE_BUCKET: envValidator.withDefaultString(z.string(), 'stexs', 'STORAGE_BUCKET'),
	TOTP_ALGORITHM: envValidator.withDefaultString(z.string(), 'SHA256', 'TOTP_ALGORITHM'),
	
	// Numbers
	STEXS_API_PORT: envValidator.withDefaultNumber(z.coerce.number(), 3001, 'STEXS_API_PORT'),
	SMTP_PORT: envValidator.withDefaultNumber(z.coerce.number(), 1025, 'SMTP_PORT'),
	STEXS_DB_PORT: envValidator.withDefaultNumber(z.coerce.number(), 5431, 'STEXS_DB_PORT'),
	TEST_DB_PORT: envValidator.withDefaultNumber(z.coerce.number(), 5555, 'TEST_DB_PORT'),
	TOTP_DIGITS: envValidator.withDefaultNumber(z.coerce.number(), 6, 'TOTP_DIGITS'),
	TOTP_PERIOD: envValidator.withDefaultNumber(z.coerce.number(), 30, 'TOTP_PERIOD'),
	JWT_EXPIRY_MFA_CHALLENGE_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 600, 'JWT_EXPIRY_MFA_CHALLENGE_LIMIT'),
	JWT_EXPIRY_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 3600, 'JWT_EXPIRY_LIMIT'),
	JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 86400, 'JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT'),
	STORAGE_PORT: envValidator.withDefaultNumber(z.coerce.number(), 9001, 'STORAGE_PORT'),
	MFA_EMAIL_CODE_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 300, 'MFA_EMAIL_CODE_EXPIRATION'),
	AUTHORIZATION_CODE_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 300, 'AUTHORIZATION_CODE_EXPIRATION'),
	PASSWORD_RECOVERY_CODE_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 900, 'PASSWORD_RECOVERY_CODE_EXPIRATION'),
	EMAIL_CHANGE_CODE_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 900, 'EMAIL_CHANGE_CODE_EXPIRATION'),
	EMAIL_VERIFICATION_CODE_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 86400, 'EMAIL_VERIFICATION_CODE_EXPIRATION'),
	S3_CACHE_CONTROL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 604800, 'S3_CACHE_CONTROL_EXPIRATION'),
	AVATAR_POST_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 60, 'AVATAR_POST_URL_EXPIRATION'),
	AVATAR_GET_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 86400, 'AVATAR_GET_URL_EXPIRATION'),
	AVATAR_SIZE_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 1048576, 'AVATAR_SIZE_LIMIT'),
	ITEM_THUMBNAIL_GET_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 86400, 'ITEM_THUMBNAIL_GET_URL_EXPIRATION'),
	ITEM_THUMBNAIL_POST_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 60, 'ITEM_THUMBNAIL_POST_URL_EXPIRATION'),
	ITEM_THUMBNAIL_SIZE_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 1048576, 'ITEM_THUMBNAIL_SIZE_LIMIT'),
	ORGANIZATION_LOGO_GET_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 86400, 'ORGANIZATION_LOGO_GET_URL_EXPIRATION'),
	ORGANIZATION_LOGO_POST_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 60, 'ORGANIZATION_LOGO_POST_URL_EXPIRATION'),
	ORGANIZATION_LOGO_SIZE_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 1048576, 'ORGANIZATION_LOGO_SIZE_LIMIT'),
	PROJECT_LOGO_GET_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 86400, 'PROJECT_LOGO_GET_URL_EXPIRATION'),
	PROJECT_LOGO_POST_URL_EXPIRATION: envValidator.withDefaultNumber(z.coerce.number(), 60, 'PROJECT_LOGO_POST_URL_EXPIRATION'),
	PROJECT_LOGO_SIZE_LIMIT: envValidator.withDefaultNumber(z.coerce.number(), 1048576, 'PROJECT_LOGO_SIZE_LIMIT'),
	
	// Passwords (required, must be explicitly set)
	STEXS_DB_PWD: z.string().min(1, 'STEXS_DB_PWD is required'),
	SMTP_PWD: z.string().min(1, 'SMTP_PWD is required'),
	
	// Secure strings (required)
	ACCESS_TOKEN_SECRET: z.string().min(1, 'ACCESS_TOKEN_SECRET is required'),
	REFRESH_TOKEN_SECRET: z.string().min(1, 'REFRESH_TOKEN_SECRET is required'),
	MFA_CHALLENGE_TOKEN_SECRET: z.string().min(1, 'MFA_CHALLENGE_TOKEN_SECRET is required'),
	STORAGE_ACCESS_KEY: z.string().min(1, 'STORAGE_ACCESS_KEY is required'),
	STORAGE_SECRET_KEY: z.string().min(1, 'STORAGE_SECRET_KEY is required'),
	LAGO_API_KEY: z.string().min(1, 'LAGO_API_KEY is required'),
	
	// URLs
	ISSUER: envValidator.withDefaultString(z.string().url(), 'http://localhost:3001', 'ISSUER'),
	AUDIENCE: envValidator.withDefaultString(z.string().url(), 'http://localhost:3000', 'AUDIENCE'),
	SIGN_IN_URL: envValidator.withDefaultString(z.string().url(), 'http://localhost:5172/sign-in', 'SIGN_IN_URL'),
	RECOVERY_URL: envValidator.withDefaultString(z.string().url(), 'http://localhost:5172/recovery', 'RECOVERY_URL'),
	LOGGER_URL: envValidator.withDefaultString(z.string().url(), undefined, 'LOGGER_URL'),

	PULSAR_URL: envValidator.withDefaultString(z.string(), 'pulsar://localhost:6650', 'PULSAR_URL'),
    PULSAR_CERT_PATH: envValidator.withDefaultString(z.string(), undefined, 'PULSAR_CERT_PATH'),
    PULSAR_PRIVATE_KEY_PATH: envValidator.withDefaultString(z.string(), undefined, 'PULSAR_PRIVATE_KEY_PATH'),

	KONG_STEXS_API_PATH: envValidator.withDefaultString(z.string(), '/api/v1', 'KONG_STEXS_API_PATH'),
});

if (envValidator.getMissingEnvVars().length > 0) {
	process.exit(1);
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
	logger.error('Invalid environment variables:', parsedEnv.error.format());
	process.exit(1);
}

const env = parsedEnv.data;

export const ENV = env.ENV!;

export const LOGGER = env.LOGGER!;
export const LOG_LEVEL = env.LOG_LEVEL!;

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
export const MFA_CHALLENGE_TOKEN_SECRET = env.MFA_CHALLENGE_TOKEN_SECRET;

export const ISSUER = env.ISSUER!;
export const AUDIENCE = env.AUDIENCE!;
export const JWT_EXPIRY_LIMIT = env.JWT_EXPIRY_LIMIT;
export const JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT = env.JWT_AUTHORIZATION_CODE_EXPIRY_LIMIT;
export const JWT_EXPIRY_MFA_CHALLENGE_LIMIT = env.JWT_EXPIRY_MFA_CHALLENGE_LIMIT;

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

export const MFA_EMAIL_CODE_EXPIRATION = env.MFA_EMAIL_CODE_EXPIRATION;
export const AUTHORIZATION_CODE_EXPIRATION = env.AUTHORIZATION_CODE_EXPIRATION;
export const PASSWORD_RECOVERY_CODE_EXPIRATION = env.PASSWORD_RECOVERY_CODE_EXPIRATION;
export const EMAIL_CHANGE_CODE_EXPIRATION = env.EMAIL_CHANGE_CODE_EXPIRATION;
export const EMAIL_VERIFICATION_CODE_EXPIRATION = env.EMAIL_VERIFICATION_CODE_EXPIRATION;
export const S3_CACHE_CONTROL_EXPIRATION = env.S3_CACHE_CONTROL_EXPIRATION;
export const AVATAR_POST_URL_EXPIRATION = env.AVATAR_POST_URL_EXPIRATION;
export const AVATAR_GET_URL_EXPIRATION = env.AVATAR_GET_URL_EXPIRATION;
export const AVATAR_SIZE_LIMIT = env.AVATAR_SIZE_LIMIT;
export const ITEM_THUMBNAIL_GET_URL_EXPIRATION = env.ITEM_THUMBNAIL_GET_URL_EXPIRATION;
export const ITEM_THUMBNAIL_POST_URL_EXPIRATION = env.ITEM_THUMBNAIL_POST_URL_EXPIRATION;
export const ITEM_THUMBNAIL_SIZE_LIMIT = env.ITEM_THUMBNAIL_SIZE_LIMIT;
export const ORGANIZATION_LOGO_GET_URL_EXPIRATION = env.ORGANIZATION_LOGO_GET_URL_EXPIRATION;
export const ORGANIZATION_LOGO_POST_URL_EXPIRATION = env.ORGANIZATION_LOGO_POST_URL_EXPIRATION;
export const ORGANIZATION_LOGO_SIZE_LIMIT = env.ORGANIZATION_LOGO_SIZE_LIMIT;
export const PROJECT_LOGO_GET_URL_EXPIRATION = env.PROJECT_LOGO_GET_URL_EXPIRATION;
export const PROJECT_LOGO_POST_URL_EXPIRATION = env.PROJECT_LOGO_POST_URL_EXPIRATION;
export const PROJECT_LOGO_SIZE_LIMIT = env.PROJECT_LOGO_SIZE_LIMIT;

export const PULSAR_URL = env.PULSAR_URL!;
export const PULSAR_CERT_PATH = env.PULSAR_CERT_PATH;
export const PULSAR_PRIVATE_KEY_PATH = env.PULSAR_PRIVATE_KEY_PATH;

export const KONG_STEXS_API_PATH = env.KONG_STEXS_API_PATH;
