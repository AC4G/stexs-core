import { StexsClient } from 'stexs-client';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
    const stexsClient = new StexsClient(fetch);

    const result = await stexsClient.auth.signIn('AC4G', 'Test12345.');

    console.log({ result });

    return {
        profiles: (await stexsClient.from('profiles').select('*')).data
    }
}
