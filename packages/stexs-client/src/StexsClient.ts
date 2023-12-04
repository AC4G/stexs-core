import { StexsAuthClient } from './StexsAuthClient';
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

  protected rest: PostgrestClient;

  constructor(
    fetch: typeof fetch,
    config: {
      authUrl: string;
      restUrl: string;
      graphQLUrl: string;
      graphQLWSUrl: string;
    },
  ) {
    this.auth = new StexsAuthClient(fetch, config.authUrl);
    this.rest = new PostgrestClient(config.restUrl, {
      fetch: this._fetchWithAuth.bind(this, fetch),
    });

    const httpLink = new HttpLink({
      uri: config.graphQLUrl,
      fetch: this._fetchWithAuth.bind(this, fetch),
    });

    const wsLink = new GraphQLWsLink(
      createClient({
        url: config.graphQLWSUrl,
        connectionParams: () => {
          const token = this._getAccessToken();

          let params = {};

          if (token) {
            params = {
              ...params,
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
