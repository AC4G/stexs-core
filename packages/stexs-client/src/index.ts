import { StexsAuthClient } from './StexsAuthClient';
import { PostgrestClient } from '@supabase/postgrest-js';
import { REST_URL } from '../.stexs-client.config';

export class StexsClient {
    auth = new StexsAuthClient();
    private rest = new PostgrestClient(REST_URL);

    from(relation: string): PostgrestQueryBuilder {
        return this.rest.from(relation);
    }    
}