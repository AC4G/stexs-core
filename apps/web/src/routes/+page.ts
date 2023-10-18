import { StexsClient } from 'stexs-client';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
    const stexsClient = new StexsClient();

    return {
        profiles: (await stexsClient.from('profiles').select('*')).data,
        auth: await stexsClient.auth.signIn('AC4G', 'Test12345.')
    }
}
