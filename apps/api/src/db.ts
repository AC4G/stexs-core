import { PG_URL, ENV } from '../env-config';
import { DbPool } from 'utils-node';

const db = new DbPool({
    connectionString: ENV === 'test' ? 'postgresql://postgres:postgres@localhost:5555/postgres' : PG_URL,
});

export default db;
