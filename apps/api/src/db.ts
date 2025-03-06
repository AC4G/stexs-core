import {
    ENV,
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_PWD,
    POSTGRES_USER,
    TEST_DB_PORT,
} from '../env-config';
import { DbPool } from 'utils-node';

const port = ENV === 'test' ? TEST_DB_PORT : POSTGRES_PORT;
const host = ENV === 'test' ? 'localhost' : POSTGRES_HOST;

const db = new DbPool({
    host,
    port,
    user: POSTGRES_USER,
    password: POSTGRES_PWD,
    database: POSTGRES_DB,
});

export default db;
