import { spawnSync } from 'child_process';
import logger from './src/logger';
import path from 'path';

const DB_CONTAINER_NAME = 'db-test';
const MIGRATE_DB_CONTAINER_NAME = 'db-test-migrate';
const SEED_DB_CONTAINER_NAME = 'db-test-seed';
const SEED_IMAGE_NAME = 'stexs-seed';

const POSTGRES_PORT = 5555;
const POSTGRES_PASSWORD = 'postgres';

const migrationsPath = path.resolve(__dirname, '../db/migrations');
const seedScriptsPath = path.resolve(__dirname, '../db/seeds');
const seedScriptFile = path.resolve(__dirname, '../../scripts/seed.db.sh');
const seedDockerfilePath = path.resolve(__dirname, '../../docker/seed.Dockerfile');
const seedBuildContext = path.resolve(__dirname, '../../');

function checkAndRemoveContainer(containerName: string) {
    const inspectResult = spawnSync('docker', ['ps', '-a', '-q', '-f', `name=${containerName}`]);
    const containerId = inspectResult.stdout.toString().trim();

    if (containerId) {
        logger.info(`Container ${containerName} exists. Removing it...`);
        logger.info(`Stopping container ${containerName}...`);

        spawnSync('docker', ['stop', containerName], { stdio: 'ignore' });

        logger.info(`Removing container ${containerName}...`);

        spawnSync('docker', ['rm', '-f', '-v', containerName], { stdio: 'ignore' });

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

    logger.info(`Cleaning test containers...`);

    checkAndRemoveContainer(DB_CONTAINER_NAME);
    checkAndRemoveContainer(MIGRATE_DB_CONTAINER_NAME);
    checkAndRemoveContainer(SEED_DB_CONTAINER_NAME);

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

    logger.info(`Checking if Docker image "${SEED_IMAGE_NAME}" exists...`);
    
    const imageCheck = spawnSync('docker', ['images', '-q', SEED_IMAGE_NAME]);
    if (!imageCheck.stdout.toString().trim()) {
        logger.info(`Image "${SEED_IMAGE_NAME}" not found. Building it...`);
        const buildResult = spawnSync('docker', [
            'build',
            '-t',
            SEED_IMAGE_NAME,
            '-f',
            seedDockerfilePath,
            seedBuildContext
        ], { stdio: 'inherit' });

        if (buildResult.error || buildResult.status !== 0) {
            logger.error(`Failed to build Docker image "${SEED_IMAGE_NAME}".`);
            process.exit(1);
        }
        logger.info(`Docker image "${SEED_IMAGE_NAME}" built successfully.`);
    }

    logger.info('Running database seed...');

    const seedResult = spawnSync('docker', [
        'run',
        '--name', SEED_DB_CONTAINER_NAME,
        '-v', `${seedScriptsPath}:/data/seeds`,
        '-v', `${seedScriptFile}:/data/scripts/seed.db.sh`,
        '--network', 'host',
        '-e', `PGRST_DB_URI=postgres://postgres:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/postgres?sslmode=disable`,
        'stexs-seed',
        '/bin/sh',
        '/data/scripts/seed.db.sh'
    ], { stdio: 'inherit' });

    if (seedResult.error) {
        logger.error('Failed to seed database:', seedResult.error);
        process.exit(1);
    }

    logger.info('Database seeded.');
}
