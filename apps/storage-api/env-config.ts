import { config } from 'dotenv';

config();

export const ENV: string = process.env.ENV!;
export const SERVER_PORT: number = parseInt(process.env.SERVER_PORT!);
export const LOGGER_URL: string = process.env.LOGGER_URL!;
