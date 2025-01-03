import { config } from 'dotenv';

config();

export const ENV: string = process.env.ENV!;
export const PG_URL: string = process.env.PG_URL!;
export const LOGGER_URL: string = process.env.LOGGER_URL!;
