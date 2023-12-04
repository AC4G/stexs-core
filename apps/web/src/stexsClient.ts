import StexsClient from 'stexs-client';
import {
  PUBLIC_AUTH_URL,
  PUBLIC_REST_URL,
  PUBLIC_GRAPHQL_URL,
  PUBLIC_GRAPHQL_WS_URL,
} from '$env/static/public';

export const stexs: StexsClient = new StexsClient(fetch, {
  authUrl: PUBLIC_AUTH_URL,
  restUrl: PUBLIC_REST_URL,
  graphQLUrl: PUBLIC_GRAPHQL_URL,
  graphQLWSUrl: PUBLIC_GRAPHQL_WS_URL,
});
