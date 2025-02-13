import { PoolClient } from "pg";
import db from "../db";

export function getQuery(client: PoolClient | undefined = undefined) {
    if (client) {
        return client.query.bind(client);
    }

    return db.query.bind(db);
}
