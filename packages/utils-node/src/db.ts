import { Pool, PoolClient, QueryConfig, QueryResult } from 'pg';

interface DbPoolConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DbPool {
  private pool: Pool;

  constructor({
    connectionString,
    max = 10,
    idleTimeoutMillis = 30000,
    connectionTimeoutMillis = 2000,
  }: DbPoolConfig) {
    this.pool = new Pool({
      connectionString,
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });
  }

  async query(queryTextOrConfig: string | QueryConfig<any[]>, values?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();

    try {
      return await client.query(queryTextOrConfig, values);
    } finally {
      client.release();
    }
  }

  async withTransaction(
    callback: (client: PoolClient) => Promise<QueryResult>
  ): Promise<QueryResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
