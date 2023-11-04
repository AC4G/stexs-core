import { Pool } from 'pg';
import { 
  PG_USER,
  PG_PASSWORD,
  PG_HOST,
  PG_DATABASE,
  PG_PORT
} from '../env-config';

const db = new Pool({
  user: PG_USER,
  password: PG_PASSWORD,
  host: PG_HOST,
  database: PG_DATABASE,
  port: PG_PORT
});

db.connect();

export default db;
