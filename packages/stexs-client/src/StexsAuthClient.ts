import EventEmitter from 'events';
import type { 
	ErrorResponse,
	TokenResponse,
	Session,
	SignInInit,
	SignInInitResponse,
	UserResponse,
} from './lib/types';
import { ApiResponse } from './lib/Response';

export enum AuthEvents {
	SIGNED_IN = 'SIGNED_IN',
	SIGN_IN_INIT = 'SIGN_IN_INIT',
	SIGNED_OUT = 'SIGNED_OUT',
	TOKEN_REFRESHED = 'TOKEN_REFRESHED',
	USER_UPDATED = 'USER_UPDATED',
	RECOVERY = 'RECOVERY',
}

export class StexsAuthClient {
	private authUrl: string;
	// @ts-ignore
	private fetch: typeof fetch;
	private authHeaders: Record<string, string> = {};

	// @ts-ignore
	private eventEmitter = new EventEmitter();

	mfa = {
		factorStatus: this._factorStatus.bind(this),
		enable: this._enable.bind(this),
		disable: this._disable.bind(this),
		verify: this._verify.bind(this),
		requestCode: this._requestCode.bind(this),
	};

	oauth = {
		authorize: this._authorize.bind(this),
		deleteConnection: this._deleteConnection.bind(this),
	};

	private refreshTimeoutId: number | null = null;
	private refreshThreshhold = 2 * 60 * 1000; // 120s

	constructor(
		fetch: {
			(input: RequestInfo, init?: RequestInit): Promise<Response>;
			(input: URL, init?: RequestInit): Promise<Response>;
		},
		authUrl: string,
	) {
		this.authUrl = authUrl;
		// @ts-ignore
		this.fetch = fetch;

		this._initialize();
	}

	private _initialize() {
		if (typeof window === 'undefined') {
			return;
		}

		const session: Session = this._getSession();
		const signInInit: SignInInit = this._getSignInInit();

		if (session && session.access_token) {
			this._setAccessTokenToAuthHeaders(session.access_token);
		}

		if (signInInit && new Date(signInInit.expires * 1000) < new Date()) {
			localStorage.removeItem('sign_in_init');
		}

		document.addEventListener('visibilitychange', async () => {
			if (!document.hidden) {
				const session = this.getSession();

				if (
					session &&
					session.expires * 1000 - this.refreshThreshhold <= Date.now()
				) {
					if (this.refreshTimeoutId !== null) {
						clearTimeout(this.refreshTimeoutId);
					}

					await this._refreshAccessToken();
				}
			}
		});

		window.addEventListener('beforeunload', () => {
			const isLocked = localStorage.getItem('refresh_lock') === 'true';

			if (isLocked) {
				localStorage.removeItem('refresh_lock');
				localStorage.removeItem('priority_tab');
			}
		});

		this._scheduleTokenRefresh();
	}

	/**
	 * Initiates the user sign-in process with the provided identifier and password.
	 * 
	 * Requests a MFA code on sign-in initialization success and if email MFA is enabled and is the only option.
	 */
	async signIn(
		identifier: string,
		password: string,
		continuousAutoRefresh: boolean = false,
	): Promise<ApiResponse<SignInInitResponse, ErrorResponse>> {
		const response = await this._request<SignInInitResponse, ErrorResponse>({
			path: '/auth/sign-in',
			body: {
				identifier,
				password,
			},
		});

		if (!response.ok) {
			return response;
		}

		const body = await response.clone().getSuccessBody();

		localStorage.setItem(
			'sign_in_init',
			JSON.stringify({
				...body,
				continuousAutoRefresh,
			}),
		);

		// subject to change in the future
		if (body.types.length === 1 && body.types[0] === 'email') {
			await this._requestCode();
		}

		this.triggerEvent(AuthEvents.SIGN_IN_INIT);

		return response;
	}

	/**
	 * Confirms the user's Multi-Factor Authentication (MFA) sign-in with the provided type and MFA code.
	 */
	async signInConfirm(type: string, code: string): Promise<ApiResponse<TokenResponse, ErrorResponse>> {
		const signInInitData: SignInInit = JSON.parse(
			localStorage.getItem('sign_in_init') as string,
		) as SignInInit;

		if (!signInInitData) {
			throw new Error('Sign in initialization data not found.');
		}

		const { token, expires, continuousAutoRefresh } = signInInitData;

		if (!token) {
			throw new Error('Sign in token was not found.');
		}

		if (Number(expires) < Date.now() / 1000) {
			throw new Error('Sign in token has expired.');
		}

		const response = await this._request<TokenResponse, ErrorResponse>({
			path: '/auth/sign-in/confirm',
			body: {
				code,
				type,
				token,
			},
		});

		if (!response.ok) {
			return response as ApiResponse<TokenResponse, ErrorResponse>;
		}

		localStorage.removeItem('sign_in_init');

		const tokenBody = await response.clone().getSuccessBody();
		
		const userResponse = await this.getUser();

		if (!userResponse.ok) {
			return Promise.reject(new Error('Failed to fetch user data'));
		}

		const user = await userResponse.getSuccessBody();

		localStorage.setItem(
			'session',
			JSON.stringify({
				...tokenBody,
				user,
				refresh: {
					enabled: continuousAutoRefresh,
					count: 0
				}
			} as Session)
		);
		
		this.triggerEvent(AuthEvents.SIGNED_IN);

		return response as ApiResponse<TokenResponse, ErrorResponse>;
	}

	/**
	 *  Deletes the sign in init session from localStorage
	 */
	cancelSignInConfirm() {
		localStorage.removeItem('sign_in_init');
	}

	/**
	 * Initiates the user signup process with the provided username, email, and password.
	 */
	async signUp(
		username: string,
		email: string,
		password: string,
	): Promise<Response> {
		return await this._request({
			path: '/auth/sign-up',
			method: 'POST',
			body: {
				username,
				email,
				password,
			},
		});
	}

	/**
	 * Gets the number of active sessions for the current user.
	 */
	async getActiveSessionsAmount(): Promise<Response> {
		return await this._request({
			path: '/auth/user/sessions',
			method: 'GET',
		});
	}

	/**
	 * Signs the user out from the current session.
	 */
	async signOut(): Promise<void> {
		await this._baseSignOut('/auth/sign-out');
	}

	/**
	 * Signs the user out from all active sessions.
	 */
	async signOutFromAllSessions(
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return await this._baseSignOut('/auth/sign-out/all-sessions', {
			code,
			type,
		});
	}

	/**
	 * Signs the user out based on the provided path, with optional session check and data clearing.
	 */
	private async _baseSignOut(
		path: string,
		body: Record<string, any> | undefined = undefined,
	): Promise<Response> {
		const response = this._request({
			path,
			method: 'POST',
			body,
		});

		localStorage.clear();

		if (this.authHeaders?.Authorization) {
			delete this.authHeaders['Authorization'];
		}

		this.triggerEvent(AuthEvents.SIGNED_OUT);

		return response;
	}

	/**
	 * Resends the email verification link to the provided email address.
	 */
	async verifyResend(email: string): Promise<Response> {
		return await this._request({
			path: '/auth/verify/resend',
			method: 'POST',
			body: { email },
		});
	}

	/**
	 * Initiates the password recovery process.
	 */
	async recovery(email: string): Promise<Response> {
		const response = await this._request({
			path: '/auth/recovery',
			method: 'POST',
			body: { email },
		});

		if (response.ok) {
			this.triggerEvent(AuthEvents.RECOVERY);
		}

		return response;
	}

	/**
	 * Confirms the password recovery process by providing the necessary information.
	 */
	async recoveryConfirm(
		email: string,
		token: string,
		password: string,
	): Promise<Response> {
		return await this._request({
			path: '/auth/recovery/confirm',
			method: 'POST',
			body: {
				email,
				token,
				password,
			},
		});
	}

	/**
	 * Retrieves data from the authenticated user.
	 */
	async getUser(): Promise<ApiResponse<UserResponse, ErrorResponse>> {
		return await this._request<UserResponse, ErrorResponse>({ path: '/auth/user' });
	}

	/**
	 * Updates the password of the authenticated user.
	 */
	async updatePassword(
		password: string,
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return await this._request({
			path: '/auth/user/password',
			method: 'POST',
			body: {
				password,
				code,
				type,
			},
		});
	}

	/**
	 * Initiates the process of changing the email for the authenticated user.
	 */
	async changeEmail(
		email: string,
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return await this._request({
			path: '/auth/user/email',
			method: 'POST',
			body: {
				email,
				code,
				type,
			},
		});
	}

	/**
	 * Verifies the requested email change for the authenticated user.
	 */
	async verifyEmailChange(code: string): Promise<Response> {
		return await this._request({
			path: '/auth/user/email/verify',
			method: 'POST',
			body: { code },
		});
	}

	/**
	 * Retrieves the Multi-Factor Authentication (MFA) status for the authenticated user.
	 */
	private async _factorStatus(): Promise<Response> {
		return await this._request({
			path: '/auth/mfa',
		});
	}

	/**
	 * Enables Multi-Factor Authentication (MFA) for the authenticated user.
	 */
	private async _enable(type: 'totp' | 'email', code: string | null = null): Promise<Response> {
		return await this._request({
			path: `/auth/mfa/enable`,
			method: 'POST',
			body: {
				type,
				code,
			},
		});
	}

	/**
	 * Disables Multi-Factor Authentication (MFA) for the authenticated user.
	 */
	private async _disable(
		type: 'totp' | 'email',
		code: string,
	): Promise<Response> {
		return await this._request({
			path: `/auth/mfa/disable`,
			method: 'POST',
			body: {
				code,
				type,
			},
		});
	}

	/**
	 * Verifies the Multi-Factor Authentication (MFA) process for an initialized enable or disable action.
	 *
	 * Currently, only Time-based One-Time Password (TOTP) is supported.
	 *
	 * Note: As new MFA methods may be implemented in the future, the required parameters for this function may change.
	 */
	private async _verify(type: 'totp', code: string): Promise<Response> {
		return await this._request({
			path: '/auth/mfa/verify',
			method: 'POST',
			body: {
				type,
				code,
			},
		});
	}

	/**
	 * Requests a new Multi-Factor Authentication (MFA) email verification code for authenticated and users in sign confirm process.
	 */
	private async _requestCode(type: string = 'email'): Promise<Response> {
		const signInInitData: SignInInit = JSON.parse(
			localStorage.getItem('sign_in_init') as string,
		);

		const body = {
			type
		};

		if (signInInitData && signInInitData.token) {
			body['token'] = signInInitData.token;
		}

		return await this._request({
			path: '/auth/mfa/send-code',
			method: 'POST',
			body,
		});
	}

	/**
	 * Initiates an OAuth2 authorization request to obtain consent from the authenticated user.
	 */
	private async _authorize(
		client_id: string,
		redirect_url: string,
		scopes: string[],
	): Promise<Response> {
		return await this._request({
			path: '/auth/oauth2/authorize',
			method: 'POST',
			body: {
				client_id,
				redirect_url,
				scopes,
			},
		});
	}

	/**
	 * Deletes an OAuth2 connection associated with the authenticated user and linked to a client.
	 */
	private async _deleteConnection(client_id: string): Promise<Response> {
		return await this._request({
			path: '/auth/oauth2/connection',
			method: 'DELETE',
			body: {
				client_id,
			},
		});
	}

	/**
	 * Retrieves an user session from local storage.
	 */
	getSession(): Session {
		return this._getSession();
	}

	/**
	 * Updates and retrieves user session from local storage.
	 */
	async updateUserInSession(): Promise<Session> {
		const session = this._getSession();

		if (!session) {
			return Promise.reject(new Error('Session is undefined'));
		}

		const response = await this.getUser();

		if (!response.ok) {
			return Promise.reject(new Error('Failed to fetch user data'));
		}

		const user = await response.getSuccessBody();

		const newSession: Session = {
			...session,
			user,
		};

		localStorage.setItem('session', JSON.stringify(newSession));

		return newSession;
	}

	/**
	 * Retrieves the sign in init session from local storage.
	 */
	getSignInInit(): SignInInit {
		return this._getSignInInit();
	}

	onAuthStateChange(callback: (event: AuthEvents) => void) {
		this.eventEmitter.on(AuthEvents.SIGNED_IN, () => {
			callback(AuthEvents.SIGNED_IN);
		});

		this.eventEmitter.on(AuthEvents.SIGN_IN_INIT, () => {
			callback(AuthEvents.SIGN_IN_INIT);
		});

		this.eventEmitter.on(AuthEvents.SIGNED_OUT, () => {
			callback(AuthEvents.SIGNED_OUT);
		});

		this.eventEmitter.on(AuthEvents.TOKEN_REFRESHED, () => {
			callback(AuthEvents.TOKEN_REFRESHED);
		});

		this.eventEmitter.on(AuthEvents.USER_UPDATED, () => {
			callback(AuthEvents.USER_UPDATED);
		});

		this.eventEmitter.on(AuthEvents.RECOVERY, () => {
			callback(AuthEvents.RECOVERY);
		});
	}

	triggerEvent(eventType: AuthEvents): void {
		this.eventEmitter.emit(eventType);
	}

	private async _scheduleTokenRefresh() {
		while (true) {
			const session = this.getSession();

			if (session && session.expires) {
				const expiresInMs = session.expires * 1000 - Date.now();

				if (this.refreshTimeoutId !== null) {
					clearTimeout(this.refreshTimeoutId);
				}

				if (expiresInMs <= this.refreshThreshhold) {
					this._refreshAccessToken();
				} else {
					this.refreshTimeoutId = setTimeout(async () => {
						const session = this.getSession();

						if (
							session &&
							session.expires * 1000 - this.refreshThreshhold <= Date.now()
						) {
							this._refreshAccessToken();
						}
					}, expiresInMs - this.refreshThreshhold) as unknown as number;
				}
			}

			await new Promise((resolve) => setTimeout(resolve, 55 * 60 * 1000));
		}
	}

	private async _refreshAccessToken(): Promise<boolean> {
		const isLocked = localStorage.getItem('refresh_lock') === 'true';
		const currentTabId = Date.now();

		if (isLocked) {
			return false;
		}

		localStorage.setItem('refresh_lock', 'true');
		localStorage.setItem('priority_tab', currentTabId.toString());

		await new Promise((resolve) => setTimeout(resolve, 1));

		const priorityTabId = localStorage.getItem('priority_tab');
		if (priorityTabId !== currentTabId.toString()) {
			localStorage.removeItem('refresh_lock');
			return false;
		}

		if (document.visibilityState !== 'visible') {
			localStorage.removeItem('refresh_lock');
			localStorage.removeItem('priority_tab');
			return false;
		}

		try {
			const session: Session = this._getSession();

			if (!session || !session.refresh_token) {
				return false;
			}

			if (session.refresh.count === 24) {
				this.signOut();
				return false;
			}

			const response = await this._request<TokenResponse, ErrorResponse>({
				path: '/auth/token',
				method: 'POST',
				body: {
					refresh_token: session.refresh_token,
				},
			});

			if (!response.ok) {
				this.signOut();
				return false;
			}

			const body = await response.getSuccessBody();
			const refresh = { ...session.refresh };

			this._setAccessTokenToAuthHeaders(body.access_token);

			if (refresh.enabled === false) {
				refresh.count++;
			}

			localStorage.setItem(
				'session',
				JSON.stringify({
					...body,
					refresh,
					user: session.user,
				}),
			);

			this.triggerEvent(AuthEvents.TOKEN_REFRESHED);
			return true;
		} catch (error) {
			console.error('Error refreshing access token:', error);
			return false;
		} finally {
			localStorage.removeItem('refresh_lock');
			localStorage.removeItem('priority_tab');
		}
	}

	private _getSession(): Session {
		return JSON.parse(localStorage.getItem('session') as string) as Session;
	}

	private _getSignInInit(): SignInInit {
		return JSON.parse(
			localStorage.getItem('sign_in_init') as string,
		) as SignInInit;
	}

	private async _request<TSuccess, TError>({
		path,
		method = 'GET',
		body = undefined,
		headers = {},
	}: {
		path: string;
		method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
		body?: Record<string, any>;
		headers?: Record<string, string>;
	}): Promise<ApiResponse<TSuccess, TError>> {
		const options: RequestInit = {
			method,
			headers: {
				'Content-Type': 'application/json',
				...this.authHeaders,
				...headers,
			},
		};

		if (method !== 'GET' && body !== null) {
			options.body = JSON.stringify(body);
		}

		const response = await this.fetch(`${this.authUrl}${path}`, options);

  		return new ApiResponse<TSuccess, TError>(response);
	}

	private _setAccessTokenToAuthHeaders(accessToken: string) {
		this.authHeaders = {
			...this.authHeaders,
			Authorization: `Bearer ${accessToken}`,
		};
	}
}
