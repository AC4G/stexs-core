import { spawnSync } from 'child_process';
import logger from './src/logger';
import path from 'path';

const DB_CONTAINER_NAME = 'db-test';
const MIGRATE_DB_CONTAINER_NAME = 'db-test-migrate';
const POSTGRES_PORT = 5555;
const POSTGRES_PASSWORD = 'postgres';

const migrationsPath = path.resolve(__dirname, '../db/migrations');

function removeContainer(containerName: string) {
    logger.info(`Checking if container ${containerName} exists...`);

    const inspectResult = spawnSync('docker', ['ps', '-a', '-q', '-f', `name=${containerName}`]);
    const containerId = inspectResult.stdout.toString().trim();

    if (containerId) {
        logger.info(`Container ${containerName} exists. Removing it...`);
        logger.info(`Stopping container ${containerName}...`);

        spawnSync('docker', ['stop', containerName], { stdio: 'ignore' });

        logger.info(`Removing container ${containerName}...`);

        spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' });

        logger.info(`Container ${containerName} removed.`);
    }
}

export default async function globalSetup() {
    logger.info('Checking if Docker is running...');

    const dockerInfo = spawnSync('docker', ['info']);
    if (dockerInfo.error || dockerInfo.status !== 0) {
        logger.error('Docker is not running. Please start Docker and try again.');
        process.exit(1);
    }

    removeContainer(DB_CONTAINER_NAME);
    removeContainer(MIGRATE_DB_CONTAINER_NAME);

    logger.info('Starting Docker container for PostgreSQL...');

    const dockerRun = spawnSync('docker', [
        'run',
        '-d',
        '--name', DB_CONTAINER_NAME, 
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
                'exec', DB_CONTAINER_NAME, 
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

    logger.info('Running database migrations...');

    const migrationResult = spawnSync('docker', [
        'run',
        '--name', MIGRATE_DB_CONTAINER_NAME,
        '-v', migrationsPath + ':/migrations',
        '--network', 'host',
        'migrate/migrate',
        '-path', '/migrations/',
        '-database', `postgresql://postgres:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/postgres?sslmode=disable`,
        'up'
    ], { stdio: 'inherit' });

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
