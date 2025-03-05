import { spawnSync } from 'child_process';
import logger from './src/logger';
import db from './src/db';

const DB_CONTAINER_NAME = 'db-test';
const MIGRATE_DB_CONTAINER_NAME = 'db-test-migrate';
const SEED_DB_CONTAINER_NAME = 'db-test-seed';

export default async function globalTeardown() {
    logger.info('Stopping and removing test containers...');

    await db.close();

    const containers = [
        DB_CONTAINER_NAME,
        MIGRATE_DB_CONTAINER_NAME,
        SEED_DB_CONTAINER_NAME
    ];

    containers.forEach(container => {
        logger.info(`Stopping container: ${container}`);
        
        const stopResult = spawnSync('docker', ['stop', container]);

        if (stopResult.error) {
            logger.error(`Failed to stop container ${container}:`, stopResult.error);
        }

        logger.info(`Removing container: ${container}`);

        const removeResult = spawnSync('docker', ['rm', '-f', '-v', container]);

        if (removeResult.error) {
            logger.error(`Failed to remove container ${container}:`, removeResult.error);
        }
    });

    logger.info('All test containers stopped and removed.');

    process.exit(0);
}
