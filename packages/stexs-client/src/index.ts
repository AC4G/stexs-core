import StexsClient from './StexsClient';

export const createClient = (fetch: typeof fetch): StexsClient => {
    return new StexsClient(fetch);
}
