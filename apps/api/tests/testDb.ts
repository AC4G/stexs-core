import { DbPool } from 'utils-node';

const db: DbPool = new DbPool({
    connectionString: 'postgresql://postgres:postgres@localhost:5555/postgres',
});

export default db
