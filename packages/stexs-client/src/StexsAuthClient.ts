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

        this._initialize();
    }

    private _initialize() {
        if (typeof window === "undefined") {
            return;
        }

        const session = JSON.parse(localStorage.getItem('session'));

        if (session && session.access_token) {
            this._setAccessTokenToAuthHeaders(session.access_token);
        }

        this._scheduleTokenRefresh();
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
        const { token, expires, autoRefresh } = JSON.parse(localStorage.getItem('sign_in_init'));

        if (!token) {
            throw new Error('Sign in token was not been found.');
        }

        if (Number(expires) < Date.now() / 1000) {
            throw new Error('Sign in token has expired.');
        }

        localStorage.removeItem('sign_in_init');

        return await this._baseSignIn({
            path: 'sign-in/confirm',
            method: 'POST',
            body: {
                code,
                type,
                token
            }
        }, autoRefresh);
    }

    private async _baseSignIn(requestParameter: {
        path: string,
        method: string,
        body: object
    }, autoRefresh : boolean): Promise<Response> {
        const response = await this._request(requestParameter);

        if (response.status === 200) {
            const clonedResponse = response.clone();
            const body = await clonedResponse.json();

            if (body.token) {
                localStorage.setItem('sign_in_init', JSON.stringify({
                    ...body,
                    autoRefresh
                }));

                if (body.types.length === 1 && body.types[0] === 'email') {
                    await this.requestMFAEmailCode();
                }

                this._triggerEvent('SIGN_IN_INIT');
            }

            if (body.access_token && body.refresh_token) {
                localStorage.setItem('session', JSON.stringify({
                    ...body,
                    refresh: {
                        enabled: autoRefresh,
                        count: 0 // Counts up to 24 if auto refresh is disabled
                    }
                }));

                this._setAccessTokenToAuthHeaders(body.access_token);

                this._triggerEvent('SIGNED_IN');
            }
        }

        return response;
    }

    async requestMFAEmailCode(): Promise<Response> {
        const signInInitData = JSON.parse(localStorage.getItem('sign_in_init'));

        if (signInInitData) {
            return await this._request({
                path: 'mfa/email/send-code',
                method: 'POST',
                body: {
                    token: signInInitData.token
                }
            });
        }

        return await this._request({
            path: 'mfa/email/send-code',
            method: 'POST'
        });
    }

    async signOut(): void {
        await this._baseSignOut('sign-out');
    }

    async signOutFromAllSessions(): void {
        await this._baseSignOut('sign-out/everywhere');
    }

    private async _baseSignOut(path: string): void {
        const session: Session = JSON.parse(localStorage.getItem('session'));

        if (session?.access_token) {
            await this._request({ path });
        }

        localStorage.clear();

        this._triggerEvent('SIGNED_OUT');
    }

    async getUser(): Promise<Response> {
        return await this._request({ path: 'user' });
    }

    onAuthStateChange(callback: (event: string, eventData?: any) => void) {
        this.eventEmitter.on('SIGNED_IN', () => {
            callback('SIGNED_IN');
        });

        this.eventEmitter.on('SIGN_IN_INIT', () => {
            callback('SIGN_IN_INIT');
        });
    
        this.eventEmitter.on('SIGNED_OUT', () => {
            callback('SIGNED_OUT');
        });

        this.eventEmitter.on('TOKEN_REFRESHED', eventData => {
            callback('TOKEN_REFRESHED', eventData);
        });

        this.eventEmitter.on('USER_UPDATED', () => {
            callback('USER_UPDATED');
        });

        this.eventEmitter.on('RECOVERY', () => {
            callback('RECOVERY');
        });
    }

    private _triggerEvent(eventType: string, eventData?: any): void {
        this.eventEmitter.emit(eventType, eventData);
    }

    private async _scheduleTokenRefresh() {
        const refreshThresholdMs = 10000; 

        while (true) {
            const session = JSON.parse(localStorage.getItem('session'));
            const expiresInMs = session.expires * 1000 - Date.now();

            if (session && session.expires) {    
                if (expiresInMs > refreshThresholdMs) {
                    const delayMs = expiresInMs - refreshThresholdMs;
    
                    setTimeout(async () => {
                        const updatedSession = JSON.parse(localStorage.getItem('session'));
    
                        if (updatedSession) {
                            await this._refreshAccessToken();
                        } 
                    }, delayMs);
                }
                
                if (expiresInMs < refreshThresholdMs) {
                    await this._refreshAccessToken();
                }
            }

            await new Promise(resolve => setTimeout(resolve, 55 * 60 * 1000 ));
        }
    }

    private async _refreshAccessToken(): Promise<boolean> {
        const session = JSON.parse(localStorage.getItem('session'));

        if (!session || !session.refresh_token) {
            return false;
        }

        if (session.refresh.count === 24) {
            this.signOut();
            return false;
        }

        const response = await this._request({
            path: 'token',
            method: 'POST',
            body: {
                refresh_token: session.refresh_token
            }
        });

        if (response.status !== 200) {
            this.signOut();
            return false;
        }

        const body = await response.json();
        const refresh = { ...session.refresh };

        if (refresh.enabled === false) {
            refresh.count++;
        }

        localStorage.setItem('session', JSON.stringify({
            ...body,
            refresh
        }));

        const accessToken = body.access_token;

        this._setAccessTokenToAuthHeaders(accessToken);

        this._triggerEvent('TOKEN_REFRESHED', accessToken);

        return true;
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
            throw e;
        }
    }

    private _setAccessTokenToAuthHeaders(accessToken: string) {
        this.authHeaders = {
            ...this.authHeaders,
            Authorization: `Bearer ${accessToken}`
        };
    }
}
