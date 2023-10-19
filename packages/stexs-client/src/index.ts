import { StexsAuthClient } from './StexsAuthClient';
import { PostgrestClient } from '@supabase/postgrest-js';
import { AUTH_URL, REST_URL } from '../.stexs-client.config';

export class StexsClient {
    auth: StexsAuthClient;

    protected rest: PostgrestClient;

    constructor(fetch: typeof fetch) {
        this.auth = new StexsAuthClient(fetch, AUTH_URL);
        this.rest = new PostgrestClient(REST_URL, { 
            fetch: (...args) => fetch(...args) 
        });
    }

    from(relation: string): PostgrestQueryBuilder {
        return this.rest.from(relation);
    }    
}
