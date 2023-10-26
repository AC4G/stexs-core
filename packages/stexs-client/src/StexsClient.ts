import { StexsAuthClient } from './StexsAuthClient';
import { PostgrestClient, PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { AUTH_URL, REST_URL } from '../.stexs-client.config';
import { Session } from './lib/types';

export default class StexsClient {
  auth: StexsAuthClient;

  protected rest: PostgrestClient;

  constructor(fetch: typeof fetch) {
    this.auth = new StexsAuthClient(fetch, AUTH_URL);
    this.rest = new PostgrestClient(REST_URL, {
      fetch: this._fetchWithAuth.bind(this, fetch),
    });
  }

  from(relation: string): PostgrestQueryBuilder {
    return this.rest.from(relation);
  }

  private async _fetchWithAuth(
    baseFetch: typeof fetch,
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response> {
    const accessToken = this._getAccessToken();
    const headers = new Headers(init?.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return baseFetch(input, { ...init, headers });
  }

  private _getAccessToken(): string | null {
    const session: Session = this.auth.getSession();
    return session?.access_token;
  }
}
