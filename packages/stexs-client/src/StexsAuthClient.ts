import EventEmitter from 'events';

export class StexsAuthClient {
    private authUrl: string;
    private fetch: typeof fetch;
    private authHeaders: Record<string, string>;

    private session: Session | null = null;
    private eventEmitter: EventEmitter = new EventEmitter();

    constructor(fetch: typeof fetch, authUrl: strint) {
        this.authUrl = authUrl;     
        this.fetch = fetch; 
    }

    async signIn(identifier: string, password: string): Promise<Response> {
        return await this._baseSignIn({
            path: 'sign-in',
            method: 'POST',
            body: {
                identifier,
                password
            }
        });
    }

    async signInConfirm(type: string, code: string): Promise<Response> {
        const token = localStorage.getItem({ path: 'sign_in_token' });

        if (!token) {
            throw new Error('Sign in token was not been found.');
        }

        return await this._baseSignIn({
            path: 'sign-in/confirm',
            method: 'POST',
            body: {
                code,
                type,
                token
            }
        });
    }

    private async _baseSignIn(requestParameter: {
        path: string,
        method: string,
        body: object
    }): Promise<Response> {
        const response = await this._request(requestParameter);

        if (response.status === 200) {
            const body = (response.clone()).json();

            if (body.token) {
                localStorage.setItem('sign_in_token', body.token);

                this._triggerEvent('SIGN_IN_INITIALIZED');
            }

            if (body.access_token && body.refresh_token) {
                localStorage.setItem('access_token', body.access_token);
                localStorage.setItem('refresh_token', body.refresh_token);
                localStorage.setItem('access_token_expiry', body.expires);

                this.authHeaders = {
                    ...this.authHeaders,
                    Authorization: `Bearer ${body.access_token}`
                };

                this._triggerEvent('SIGNED_IN');
            }
        }

        return response;
    }

    async signOut(): void {
        await this._baseSignOut('sign-out');
    }

    async signOutFromAllSessions() {
        await this._baseSignOut('sign-out/everywhere');
    }

    private async _baseSignOut(path: string): void {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        await this._request({ path });

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        this._triggerEvent('SIGNED_OUT');
    }

    async getUser() {
        return await this._request({ path: 'user' });
    }

    onAuthStateChange(callback: (event: string) => void) {
        this.eventEmitter.on('SIGNED_IN', () => {
            callback('SIGNED_IN');
        });

        this.eventEmitter.on('SIGN_IN_INITIALIZED', () => {
            callback('SIGN_IN_INITIALIZED');
        });
    
        this.eventEmitter.on('SIGNED_OUT', () => {
            callback('SIGNED_OUT');
        });

        this.eventEmitter.on('TOKEN_REFRESHED', () => {
            callback('TOKEN_REFRESHED');
        });

        this.eventEmitter.on('USER_UPDATED', () => {
            callback('USER_UPDATED');
        });

        this.eventEmitter.on('RECOVERY', () => {
            callback('RECOVERY');
        });
    }

    private _triggerEvent(eventType: string): void {
        this.eventEmitter.emit(eventType);
    }

    private async _request({
        path, 
        method = 'GET',
        body = null,
        headers = {}
    } : {
        path: string;
        method?: string;
        body?: object | null;
        headers?: Record<string, string>;
    }): Promise<Response> {
        try {
            return await this.fetch(`${this.authUrl}/${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...this.authHeaders,
                    ...headers
                },
                body: JSON.stringify(body)
            });
        } catch (e) {
            throw new Error(`Request failed: ${e.message}`);
        }
    }
}
