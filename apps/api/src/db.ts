import { PG_URL } from '../env-config';
import { DbPool } from 'utils-node';

const db: DbPool = new DbPool({
	connectionString: PG_URL,
});

export default db;
