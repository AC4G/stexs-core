import { PoolClient } from "pg";
import db from "../db";

export interface QueryResult<T = any> {
    rowCount: number | null;
    rows: T[];
}

export function getQuery(client: PoolClient | undefined = undefined) {
    if (client) {
        return client.query.bind(client);
    }

    return db.query.bind(db);
}
