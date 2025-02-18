import { readFileSync } from 'fs';
import path from 'path';
import { readdirSync } from 'fs';
import db from './db';
import { fileURLToPath } from 'url';
import logger from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runSQL = async (filepath: string): Promise<boolean> => {
  const sql = readFileSync(filepath, 'utf-8');

  logger.info(`Executing seed file: ${filepath}`);

  try {
    await db.query(sql);

    logger.info(`Finished ${filepath} seed successfully!`);

    return true;
  } catch (e) {
    logger.error(`Error executing seed file: ${filepath}`);
    logger.error(`PostgreSQL Error:\n${
      e instanceof Error ? e.message : e
    }`);

    return false;
  }
};

export const runSeeds = async () => {
  const seedsDir = `./${path.relative(process.cwd(), path.join(__dirname, '../seeds'))}`;
  const seedFiles = readdirSync(seedsDir).filter(file => file.endsWith('.sql'));

  if (seedFiles.length === 0) {
    logger.info('No seed files found.');
    return;
  }

  logger.info(`Found ${seedFiles.length} seed files in ${seedsDir}`);

  let successCount = 0;
  let failureCount = 0;

  for (const file of seedFiles) {
    const filepath = path.join(seedsDir, file);
    const isSuccess = await runSQL(filepath);
    if (isSuccess) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  if (failureCount === 0) {
    logger.info(`All ${successCount} seeds executed successfully!`);
  } else {
    logger.warn(
      `${successCount} seeds executed successfully, but ${failureCount} failed.`
    );
  }
};
