import EventEmitter from 'events';
import { Session } from './utils/types';

export class StexsAuthClient {
    private authUrl: string;
    private fetch: typeof fetch;
    private authHeaders: Record<string, string>;

    private eventEmitter: EventEmitter = new EventEmitter();

    constructor(fetch: typeof fetch, authUrl: string) {
        this.authUrl = authUrl;     
        this.fetch = fetch;
    }

    async signIn(identifier: string, password: string, autoRefresh: boolean = false): Promise<Response> {
        return await this._baseSignIn({
            path: 'sign-in',
            method: 'POST',
            body: {
                identifier,
                password
            }
        }, autoRefresh);
    }

    async signInConfirm(type: string, code: string): Promise<Response> {
        const signInInitData = localStorage.getItem('sign_in_init');

        if (!signInInitData?.token) {
            throw new Error('Sign in token was not been found.');
        }

        if (Number(expiry) < Date.now() / 1000) {
            throw new Error('Sign in token has expired.');
        }

        localStorage.removeItem('sing_in_init');

        return await this._baseSignIn({
            path: 'sign-in/confirm',
            method: 'POST',
            body: {
                code,
                type,
                token
            }
        }, signInInitData.autoRefresh);
    }

    private async _baseSignIn(requestParameter: {
        path: string,
        method: string,
        body: object
    }, autoRefresh : boolean): Promise<Response> {
        const response = await this._request(requestParameter);

        if (response.status === 200) {
            const body = (response.clone()).json();

            if (body.token) {
                localStorage.setItem('sign_in_init', {
                    ...body,
                    autoRefresh
                });

                this._triggerEvent('SIGN_IN_INITIALIZED');
            }

            if (body.access_token && body.refresh_token) {

                localStorage.setItem('session', {
                    ...body,
                    refresh: {
                        enabled: autoRefresh,
                        count: 0 // Counts up to 24 if auto refresh is disabled
                    }
                });

                this._setAccessTokenToAuthHeaders(body.access_token);

                this._triggerEvent('SIGNED_IN');
            }
        }

        return response;
    }

    async signOut(): void {
        await this._baseSignOut('sign-out');
    }

    async signOutFromAllSessions(): void {
        await this._baseSignOut('sign-out/everywhere');
    }

    private async _baseSignOut(path: string): void {
        const session: Session = localStorage.getItem('session');

        if (!session?.access_token) {
            return;
        }

        await this._request({ path });

        localStorage.removeItem('session');

        this._triggerEvent('SIGNED_OUT');
    }

    async getUser(): Promise<Response> {
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
        body?: object;
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

    private _setAccessTokenToAuthHeaders(accessToken: string) {
        this.authHeaders = {
            ...this.authHeaders,
            Authorization: `Bearer ${accessToken}`
        };
    }
}
