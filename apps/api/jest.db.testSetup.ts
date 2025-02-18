import { spawnSync } from 'child_process';
import logger from './src/logger';

const CONTAINER_NAME = 'db-test';
const POSTGRES_PORT = 5555;
const POSTGRES_PASSWORD = 'postgres';

export default async function globalSetup() {
    logger.info('Checking if Docker is running...');

    const dockerInfo = spawnSync('docker', ['info']);
    if (dockerInfo.error || dockerInfo.status !== 0) {
        logger.error('Docker is not running. Please start Docker and try again.');
        process.exit(1);
    }

    logger.info('Starting Docker container for PostgreSQL...');

    const dockerRun = spawnSync('docker', [
        'run', 
        '-d', 
        '--name', CONTAINER_NAME, 
        '-e', `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`, 
        '-p', `${POSTGRES_PORT}:5432`, 
        'docker.io/postgres:17.2'
    ]);

    if (dockerRun.error) {
        logger.error('Failed to start PostgreSQL container:', dockerRun.error);
        process.exit(1);
    }

    logger.info('PostgreSQL container started, waiting for it to be ready...');

    const startTime = Date.now();
    const timeout = 60000;
    let isReady = false;

    while (Date.now() - startTime < timeout && !isReady) {
        try {
            const result = spawnSync('docker', [
                'exec', CONTAINER_NAME, 
                'pg_isready', '-U', 'postgres', '-h', 'localhost', '-p', '5432'
            ]);

            if (result.error) throw new Error('Postgres not ready');

            if (result.status === 0) {
                isReady = true;
                logger.info('PostgreSQL is ready!');
            }
        } catch (err) {
            if (Date.now() - startTime >= timeout) {
                logger.error('PostgreSQL container did not start in time!');
                process.exit(1);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const migrationResult = spawnSync('migrate', [
        '-path', '../db/migrations',
        '-database', `postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/postgres?sslmode=disable`,
        'up'
    ]);

    if (migrationResult.error) {
        logger.error('Failed to run migrations:', migrationResult.error);
        process.exit(1);
    }

    logger.info('Database migrations completed.');

    const seedingResult = spawnSync(
        'cross-env',
        [
            'ENV=test',
            'pnpm',
            '-w',
            'run',
            'seed',
            '--force'
        ],
        {
            env: process.env,
        }
    );

    if (seedingResult.error) {
        logger.error('Failed to seed database:', seedingResult.error);
        process.exit(1);
    }

    logger.info('Database seeded.');
}
