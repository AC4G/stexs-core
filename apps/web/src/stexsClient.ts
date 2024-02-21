import StexsClient from 'stexs-client';
import {
  PUBLIC_STORAGE_URL,
  PUBLIC_AUTH_URL,
  PUBLIC_REST_URL
} from '$env/static/public';

export const stexs: StexsClient = new StexsClient(fetch, {
  authUrl: PUBLIC_AUTH_URL,
  restUrl: PUBLIC_REST_URL,
  storageURL: PUBLIC_STORAGE_URL
});
