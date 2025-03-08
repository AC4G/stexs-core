import { spawnSync, SpawnSyncReturns } from 'child_process';
import logger from './src/logger';
import path from 'path';
import {
    TEST_DB_PORT,
    POSTGRES_DB,
    POSTGRES_PWD,
    POSTGRES_USER
} from './env-config';

const DB_CONTAINER_NAME = 'db-test';
const MIGRATE_DB_CONTAINER_NAME = 'db-test-migrate';
const SEED_DB_CONTAINER_NAME = 'db-test-seed';
const SEED_IMAGE_NAME = 'stexs-db-seed';
const TEST_PG_URL = `postgres://${POSTGRES_USER}:${POSTGRES_PWD}@localhost:${TEST_DB_PORT}/${POSTGRES_DB}?sslmode=disable`;

const POSTGRES_PASSWORD = 'postgres';

const rootProjectPath = path.resolve(__dirname, '../../');
const migrationsPath = `${rootProjectPath}/db/migrations`;
const seedScriptsPath = `${rootProjectPath}/db/seeds`;
const seedScriptFile = `${rootProjectPath}/scripts/seed.db.sh`;
const seedDockerfilePath = `${rootProjectPath}/docker/seed.Dockerfile`;

function checkAndRemoveContainer(containerName: string) {
    const inspectResult = spawnSync('docker', ['ps', '-a', '-q', '-f', `name=${containerName}`]);
    const containerId = inspectResult.stdout.toString().trim();

    if (containerId) {
        logger.info(`Container ${containerName} exists. Removing it...`);
        logger.info(`Stopping container ${containerName}...`);

        spawnSync('docker', ['stop', containerName], { stdio: 'ignore' });

        logger.info(`Removing container ${containerName}...`);

        spawnSync('docker', ['rm', '-f', '-v', containerName], { stdio: 'ignore' });

        logger.info(`Container ${containerName} removed!`);
    }
}

function execDBHealthCheck(): SpawnSyncReturns<Buffer> {
    return spawnSync('docker', [
        'exec', DB_CONTAINER_NAME,
        'pg_isready', '-U', 'postgres', '-h', 'localhost', '-p', '5432'
    ]);
}

export default async function globalSetup() {
    logger.info('Preparing test environment...');
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
        '-e', `POSTGRES_USER=${POSTGRES_USER}`,
        '-e', `POSTGRES_DB=${POSTGRES_DB}`,
        '-p', `${TEST_DB_PORT}:5432`,
        'docker.io/postgres:17.2'
    ]);

    if (dockerRun.error) {
        logger.error('Failed to start PostgreSQL container:', dockerRun.error);
        process.exit(1);
    }

    logger.info('PostgreSQL container started, waiting for it to be ready...');

    const startTime = Date.now();
    const timeout = 60000;

    while (Date.now() - startTime < timeout) {
        try {
            const result = execDBHealthCheck();

            if (result.status === 0) {
                logger.info('PostgreSQL is ready!');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            if (Date.now() - startTime >= timeout) {
                logger.error('PostgreSQL container did not start in time.');
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
        '-database', TEST_PG_URL,
        'up'
    ], { stdio: 'inherit' });

    if (migrationResult.error || migrationResult.status !== 0) {
        logger.error(
          'Failed to run migrations:',
          migrationResult.error || `Migration exited with status ${migrationResult.status}`
        );
        process.exit(1);
    }

    logger.info('Database migrations completed!');

    const dbHealthResult = execDBHealthCheck();

    if (dbHealthResult.error || dbHealthResult.status !== 0) {
        logger.error('PostgreSQL is not healthy after migrations.');
        process.exit(1);
    }

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
            rootProjectPath
        ], { stdio: 'inherit' });

        if (buildResult.error || buildResult.status !== 0) {
            logger.error(`Failed to build Docker image "${SEED_IMAGE_NAME}".`);
            process.exit(1);
        }

        logger.info(`Docker image "${SEED_IMAGE_NAME}" built successfully!`);
    }

    logger.info('Running database seed...');

    const seedResult = spawnSync('docker', [
        'run',
        '--name', SEED_DB_CONTAINER_NAME,
        '-v', `${seedScriptsPath}:/data/seeds`,
        '-v', `${seedScriptFile}:/data/scripts/seed.db.sh`,
        '--network', 'host',
        '-e', `PGRST_DB_URI=${TEST_PG_URL}`,
        SEED_IMAGE_NAME,
        '/bin/sh',
        '/data/scripts/seed.db.sh'
    ], { stdio: 'inherit' });

    if (seedResult.error) {
        logger.error('Failed to seed database:', seedResult.error);
        process.exit(1);
    }

    logger.info('Database seeded!');
}
