import { config } from 'dotenv';
import logger from './src/logger';
import { z } from 'zod';
import { EnvValidator } from 'utils-node';

config();

const requiredVars = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PWD',
    'SMTP_EMAIL',
];

const envValidator: EnvValidator = new EnvValidator(logger);

requiredVars.forEach(envValidator.checkEnvVarExists.bind(envValidator));

const envSchema: any = z.object({
    ENV: envValidator.withDefaultString(z.string(), 'dev', 'ENV'),
	LOGGER: envValidator.withDefaultString(z.enum(['console', 'loki']), 'console', 'LOGGER'),
	LOG_LEVEL: envValidator.withDefaultString(z.string(), 'info', 'LOG_LEVEL'),
	LOGGER_URL: envValidator.withDefaultString(z.string(), 'http://localhost:3100', 'LOGGER_URL'),

    SMTP_PORT: envValidator.withDefaultNumber(z.coerce.number().int(), 587, 'SMTP_PORT'),
	SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
	SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
    SMTP_PWD: z.string().min(1, 'SMTP_PWD is required'),
	SMTP_EMAIL: z.string().email('SMTP_EMAIL is invalid').min(1, 'SMTP_EMAIL is required'),
    SMTP_SENDER_NAME: envValidator.withDefaultString(z.string(), 'STEXS', 'SMTP_SENDER_NAME'),
    SMTP_SECURE: envValidator.withDefaultBoolean(false, 'SMTP_SECURE'),

    PULSAR_URL: envValidator.withDefaultString(z.string(), 'pulsar://localhost:6650', 'PULSAR_URL'),
    PULSAR_CERT_PATH: envValidator.withDefaultString(z.string(), undefined, 'PULSAR_CERT_PATH'),
    PULSAR_PRIVATE_KEY_PATH: envValidator.withDefaultString(z.string(), undefined, 'PULSAR_PRIVATE_KEY_PATH'),
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

export const LOGGER: 'console' | 'loki' = env.LOGGER!;
export const LOG_LEVEL = env.LOG_LEVEL!;

export const LOGGER_URL = env.LOGGER_URL!;

export const SMTP_PORT = env.SMTP_PORT!;
export const SMTP_HOST = env.SMTP_HOST!;
export const SMTP_USER = env.SMTP_USER!;
export const SMTP_PWD = env.SMTP_PWD!;
export const SMTP_EMAIL = env.SMTP_EMAIL!;
export const SMTP_SENDER_NAME = env.SMTP_SENDER_NAME!;
export const SMTP_SECURE = env.SMTP_SECURE!;

export const PULSAR_URL = env.PULSAR_URL!;
export const PULSAR_CERT_PATH = env.PULSAR_CERT_PATH;
export const PULSAR_PRIVATE_KEY_PATH = env.PULSAR_PRIVATE_KEY_PATH;
