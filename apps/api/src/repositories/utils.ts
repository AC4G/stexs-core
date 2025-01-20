import { PoolClient } from "pg";
import db from "../db";

export interface QueryResult<T = any> {
    rowCount: number | null;
    rows: T[];
}

export function getQuery(client: PoolClient | undefined = undefined) {
    return client?.query || db.query;
}
