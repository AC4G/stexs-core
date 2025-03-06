import {
  Pool,
  PoolClient,
  type PoolConfig,
  QueryConfig,
  QueryResult,
  QueryResultRow
} from 'pg';

export class DbPool {
  private pool: Pool;

  constructor({
    max = 10,
    idleTimeoutMillis = 30000,
    connectionTimeoutMillis = 2000,
    ...rest
  }: PoolConfig) {
    this.pool = new Pool({
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      ...rest,
    });
  }

  async query<T extends QueryResultRow = any>(queryTextOrConfig: string | QueryConfig<any[]>, values?: any[]): Promise<QueryResult<T>> {
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

  async withRollbackTransaction(
    callback: (client: PoolClient) => Promise<void>
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await callback(client);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
