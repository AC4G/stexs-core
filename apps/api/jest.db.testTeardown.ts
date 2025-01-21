import { spawnSync } from 'child_process';
import logger from './src/loggers/logger';
import db from './src/db';

const CONTAINER_NAME = 'db-test';

export default async function globalTeardown() {
    logger.info('Stopping and removing postgres test container...');

    await db.close();
    
    const stopResult = spawnSync('docker', ['stop', CONTAINER_NAME]);
    if (stopResult.error) {
        logger.error('Failed to stop postgres test container:', stopResult.error);
    }
    
    const removeResult = spawnSync('docker', ['rm', CONTAINER_NAME]);
    if (removeResult.error) {
        logger.error('Failed to remove postgres test container:', removeResult.error);
    }

    logger.info('Postgres test container stopped and removed.');

    process.exit(0);
}
