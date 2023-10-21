import { StexsAuthClient } from './StexsAuthClient';
import { PostgrestClient, PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { AUTH_URL, REST_URL, API_KEY } from '../.stexs-client.config';
import { Session } from './utils/types';

export default class StexsClient {
    auth: StexsAuthClient;
    defaultRestHeaders = {
        apikey: API_KEY
    };

    protected rest: PostgrestClient;

    constructor(fetch: typeof fetch) {
        this.auth = new StexsAuthClient(fetch, AUTH_URL, {
            apikey: API_KEY
        });
        this.rest = new PostgrestClient(REST_URL, {
            fetch: this._fetchWithAuth.bind(this, fetch)
        });
    }

    from(relation: string): PostgrestQueryBuilder {
        return this.rest.from(relation);
    }

    private async _fetchWithAuth(baseFetch: typeof fetch, input: RequestInfo, init?: RequestInit): Promise<Response> {
        const accessToken = this._getAccessToken();
        const headers = new Headers(init?.headers);

        if (!headers.has('apikey')) {
            headers.set('apikey', API_KEY);
        }

        if (accessToken) {
            if (!headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${accessToken}`);
            }
        }

        return baseFetch(input, { ...init, headers });
    }

    private _getAccessToken(): string | null {
        const session: Session = this.auth.getSession();
        return session?.access_token;
    }
}
