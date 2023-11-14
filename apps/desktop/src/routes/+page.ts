import { stexsClient } from '../stexsClient';
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load() {
    if (!stexsClient.auth.getSession()) {
        throw redirect(307, '/sign-in');
    }
}
