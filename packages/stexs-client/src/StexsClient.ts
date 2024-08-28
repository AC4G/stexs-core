import { StexsAuthClient, AuthEvents } from './StexsAuthClient';
import { StexsStorageClient } from './StexsStorageClient';
import {
  PostgrestClient,
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from '@supabase/postgrest-js';
import type { Session } from './lib/types';

export { AuthEvents };

export default class StexsClient {
  auth: StexsAuthClient;
  storage: StexsStorageClient;

  protected rest: PostgrestClient;

  constructor(
    // @ts-ignore
    fetch: typeof fetch,
    config: {
      authUrl: string;
      restUrl: string;
      storageURL: string;
    },
  ) {
    this.auth = new StexsAuthClient(fetch, config.authUrl);
    this.rest = new PostgrestClient(config.restUrl, {
      // @ts-ignore
      fetch: this._fetchWithAuth.bind(this, fetch),
    });
    this.storage = new StexsStorageClient(
      this._fetchWithAuth.bind(this, fetch),
      config.storageURL,
    );
  }

  // @ts-ignore
  from(relation: string): PostgrestQueryBuilder {
    return this.rest.from(relation);
  }

  rpc(fn: string,
    args = {},
    options?: {
      head?: boolean;
      count?: 'exact' | 'planned' | 'estimated';
    },
  // @ts-ignore
  ): PostgrestFilterBuilder {
    return this.rest.rpc(fn, args, options);
  }

  private async _fetchWithAuth(
    baseFetch: typeof fetch,
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response> {
    await this._checkAndWaitForNewAccessToken();

    const headers = new Headers(init?.headers);
    const accessToken = this._getSession()?.access_token;

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return baseFetch(input, { ...init, headers });
  }

  private async _checkAndWaitForNewAccessToken(retryCount: number = 0): Promise<void> {
    const session = this._getSession();
    const maxRetries = 100;

    if (retryCount === maxRetries) {
      throw Error(
        `Max retries (${maxRetries}) reached, access token still expired after waiting for refresh.`,
      );
    }

    if (
      retryCount < maxRetries &&
      session &&
      session.expires * 1000 - 120 * 1000 <= Date.now()
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this._checkAndWaitForNewAccessToken(retryCount + 1);
    }
  }

  private _getSession(): Session | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return this.auth.getSession();
  }
}
