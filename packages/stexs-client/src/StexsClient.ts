import { StexsAuthClient } from './StexsAuthClient';
import { StexsStorageClient } from './StexsStorageClient';
import {
  PostgrestClient,
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from '@supabase/postgrest-js';
import type { Session } from './lib/types';
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  gql,
} from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import WebSocket from 'isomorphic-ws';

export { gql };

export default class StexsClient {
  auth: StexsAuthClient;
  graphql: ApolloClient;
  storage: StexsStorageClient;

  protected rest: PostgrestClient;

  constructor(
    fetch: typeof fetch,
    config: {
      authUrl: string;
      restUrl: string;
      storageURL: string;
      graphQLUrl: string;
      graphQLWSUrl: string;
    },
  ) {
    this.auth = new StexsAuthClient(fetch, config.authUrl);
    this.rest = new PostgrestClient(config.restUrl, {
      fetch: this._fetchWithAuth.bind(this, fetch),
    });
    this.storage = new StexsStorageClient(this._fetchWithAuth.bind(this, fetch), config.storageURL);

    const httpLink = new HttpLink({
      uri: config.graphQLUrl,
      fetch: this._fetchWithAuth.bind(this, fetch),
    });

    const wsLink = new GraphQLWsLink(
      createClient({
        url: config.graphQLWSUrl,
        connectionParams: async () => {
          await this._checkAndWaitForNewAccessToken();

          const token = this._getSession()?.access_token;

          let params = {};

          if (token) {
            params = {
              Authorization: `Bearer ${token}`,
            };
          }

          return params;
        },
        webSocketImpl: WebSocket,
      }),
    );

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink,
    );

    this.graphql = new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });
  }

  from(relation: string): PostgrestQueryBuilder {
    return this.rest.from(relation);
  }

  rpc(
    fn: string,
    args = {},
    options?: {
      head?: boolean;
      count?: 'exact' | 'planned' | 'estimated';
    },
  ): PostgrestFilterBuilder {
    return this.rest.rpc(fn, args, options);
  }

  private async _fetchWithAuth(
    baseFetch: typeof fetch,
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    await this._checkAndWaitForNewAccessToken();

    const headers = new Headers(init?.headers);
    const accessToken = this._getSession()?.access_token;

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return baseFetch(input, { ...init, headers });
  }

  private async _checkAndWaitForNewAccessToken(retryCount: number = 0) {
    const session = this._getSession();
    const maxRetries = 100;

    if (retryCount === maxRetries) {
      throw Error(`Max retries (${maxRetries}) reached, access token still expired after waiting for refresh.`);
    }

    if (retryCount < maxRetries && session && (session.expires * 1000 - 120 * 1000) <= Date.now()) {
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
