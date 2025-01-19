import { spawnSync } from 'child_process';
import logger from './src/loggers/logger';
import db from './tests/testDb';

const CONTAINER_NAME = 'db-test';

export default async function globalTeardown() {
    await db.close();

    logger.info('Stopping and removing Docker container...');
    
    const stopResult = spawnSync('docker', ['stop', CONTAINER_NAME]);
    if (stopResult.error) {
        logger.error('Failed to stop container:', stopResult.error);
    }
    
    const removeResult = spawnSync('docker', ['rm', CONTAINER_NAME]);
    if (removeResult.error) {
        logger.error('Failed to remove container:', removeResult.error);
    }

    logger.info('Docker container stopped and removed.');

    process.exit(0);
}
