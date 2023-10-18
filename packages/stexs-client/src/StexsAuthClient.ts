import { request } from './utils/request';

export class StexsAuthClient {
    async signIn(identifier: string, password: string) {
        const url = 'http://localhost:3001/sign-in';
        const data = {
            identifier,
            password
        };

        return await request(url, 'POST', data);
    }
}
