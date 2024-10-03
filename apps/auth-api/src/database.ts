import { Pool } from 'pg';
import { PG_URL } from '../env-config';

const db = new Pool({
	connectionString: PG_URL,
});

db.connect();

export default db;
