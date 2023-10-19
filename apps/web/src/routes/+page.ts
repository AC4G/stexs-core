import { StexsClient } from 'stexs-client';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
    const stexsClient = new StexsClient(fetch);

    return {
        profiles: (await stexsClient.from('profiles').select('*')).data
    }
}
