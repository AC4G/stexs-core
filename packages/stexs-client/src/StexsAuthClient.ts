import EventEmitter from 'events';
import type { Session, SignInInit } from './lib/types';

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
	private fetch: typeof fetch;
	private authHeaders: Record<string, string> = {};

	private eventEmitter = new EventEmitter();

	mfa;
	oauth;

	private refreshTimeoutId: number | null = null;
	private refreshThreshhold = 120 * 1000; // 120s

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

		this.mfa = {
			factorStatus: this._factorStatus.bind(this),
			enable: this._enable.bind(this),
			disable: this._disable.bind(this),
			verify: this._verify.bind(this),
			requestCode: this._requestCode.bind(this),
		};
		this.oauth = {
			authorize: this._authorize.bind(this),
			deleteConnection: this._deleteConnection.bind(this),
		};

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
	 * If Multi-Factor Authentication (MFA) is disabled for the user, they will be signed in directly.
	 * If MFA is enabled, the user will need to go through sign in confirmation.
	 *
	 * @param {string} identifier - The user's identifier (e.g., username or email).
	 * @param {string} password - The user's password.
	 * @param {boolean} continuousAutoRefresh - Set to true for continuous access token refresh.
	 * @returns {Promise<Response>} A Promise that resolves with the sign-in response data.
	 */
	async signIn(
		identifier: string,
		password: string,
		continuousAutoRefresh: boolean = false,
	): Promise<Response> {
		return await this._baseSignIn(
			{
				path: 'sign-in',
				body: {
					identifier,
					password,
				},
			},
			continuousAutoRefresh,
		);
	}

	/**
	 * Confirms the user's Multi-Factor Authentication (MFA) sign-in with the provided type and MFA code.
	 *
	 * This function confirms the user's MFA sign-in by providing the MFA code and type.
	 *
	 * @param {string} type - The type of MFA confirmation (e.g., email).
	 * @param {string} code - The Multi-Factor Authentication (MFA) code.
	 * @returns {Promise<Response>} A Promise that resolves with the confirmation response data.
	 * @throws {Error} Throws an error if the sign-in token is not found or has expired.
	 */
	async signInConfirm(type: string, code: string): Promise<Response> {
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

		const response = await this._baseSignIn(
			{
				path: 'sign-in/confirm',
				body: {
					code,
					type,
					token,
				},
			},
			continuousAutoRefresh,
		);

		if (response.ok) {
			localStorage.removeItem('sign_in_init');
		}

		return response;
	}

	/**
	 *  Deletes the sign in init session from localStorage
	 */
	cancelSignInConfirm() {
		localStorage.removeItem('sign_in_init');
	}

	/**
	 * Performs the base logic for the sign-in process.
	 *
	 * @param {Object} requestParameter - The request parameters, including path, method, and request body.
	 * @param {boolean} continuousAutoRefresh - Set to true for continuous access token refresh.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	private async _baseSignIn(
		requestParameter: {
			path: string;
			body: Record<string, any>;
		},
		continuousAutoRefresh: boolean,
	): Promise<Response> {
		const response = await this._request({
			...requestParameter,
			method: 'POST',
		});

		if (response.ok) {
			const clonedResponse = response.clone();
			const body = await clonedResponse.json();

			if (body.token) {
				localStorage.setItem(
					'sign_in_init',
					JSON.stringify({
						...body,
						continuousAutoRefresh,
					}),
				);

				//subject to change in the future
				if (body.types.length === 1 && body.types[0] === 'email') {
					await this._requestCode();
				}

				this.triggerEvent(AuthEvents.SIGN_IN_INIT);
			}

			if (body.access_token && body.refresh_token) {
				this._setAccessTokenToAuthHeaders(body.access_token);

				const user = await (await this.getUser()).json();

				localStorage.setItem(
					'session',
					JSON.stringify({
						...body,
						refresh: {
							enabled: continuousAutoRefresh,
							count: 0, // Counts up to 24 if auto refresh is disabled
						},
						user,
					}),
				);

				this.triggerEvent(AuthEvents.SIGNED_IN);
			}
		}

		return response;
	}

	/**
	 * Initiates the user signup process with the provided username, email, and password.
	 *
	 * @param {string} username - The username for the new account.
	 * @param {string} email - The email address for the new account.
	 * @param {string} password - The password for the new account.
	 * @returns {Promise<Response>} A Promise that resolves with the signup response data.
	 */
	async signUp(
		username: string,
		email: string,
		password: string,
	): Promise<Response> {
		return await this._request({
			path: 'sign-up',
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
	 *
	 * @returns {Promise<Response>} A Promise that resolves with the active sessions response data.
	 */
	async getActiveSessionsAmount(): Promise<Response> {
		return await this._request({
			path: 'user/sessions',
			method: 'GET',
		});
	}

	/**
	 * Signs the user out from the current session.
	 *
	 * @returns {Promise<void>} A Promise that resolves with void.
	 */
	async signOut(): Promise<void> {
		await this._baseSignOut('sign-out');
	}

	/**
	 * Signs the user out from all active sessions.
	 *
	 * @returns {Promise<Response>} A Promise that resolves with void.
	 */
	async signOutFromAllSessions(
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return await this._baseSignOut('sign-out/all-sessions', {
			code,
			type,
		});
	}

	/**
	 * Signs the user out based on the provided path, with optional session check and data clearing.
	 *
	 * @param {string} path - The path specifying the sign-out action.
	 * @returns {Promise<void>} A Promise that resolves with void.
	 */
	private async _baseSignOut(
		path: string,
		body: Record<string, any> | undefined = undefined,
	): Promise<Response> {
		const response = await this._request({
			path,
			method: 'POST',
			body,
		});

		if (!response.ok) {
			return response;
		}

		localStorage.clear();

		if (this.authHeaders?.Authorization) {
			delete this.authHeaders['Authorization'];
		}

		this.triggerEvent(AuthEvents.SIGNED_OUT);

		return response;
	}

	/**
	 * Resends the email verification link to the provided email address.
	 *
	 * @param {string} email - The email address for which the verification link is to be resent.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async verifyResend(email: string): Promise<Response> {
		return await this._request({
			path: 'verify/resend',
			method: 'POST',
			body: { email },
		});
	}

	/**
	 * Initiates the password recovery process.
	 *
	 * @param {string} email - The user's email address for account recovery.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async recovery(email: string): Promise<Response> {
		const response = await this._request({
			path: 'recovery',
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
	 *
	 * @param {string} email - The email address associated with the account.
	 * @param {string} token - The recovery token received via email.
	 * @param {string} password - The new password to set for the account.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async recoveryConfirm(
		email: string,
		token: string,
		password: string,
	): Promise<Response> {
		return await this._request({
			path: 'recovery/confirm',
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
	 *
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async getUser(): Promise<Response> {
		return await this._request({ path: 'user' });
	}

	/**
	 * Updates the password of the authenticated user.
	 *
	 * @param {string} password - The new password to set.
	 * @param {string} code - The authentication code from the selected MFA method (either email code or TOTP secret).
	 * @param {string} type - The MFA method to be used for authentication.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async updatePassword(
		password: string,
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return await this._request({
			path: 'user/password',
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
	 *
	 * @param {string} email - The new email address to be set.
	 * @param {string} code - The authentication code from the selected MFA method (either email code or TOTP secret).
	 * @param {string} type - The MFA method to be used for authentication.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async changeEmail(
		email: string,
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return await this._request({
			path: 'user/email',
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
	 *
	 * @param {string} code - The verification code sent to the new email address.
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	async verifyEmailChange(code: string): Promise<Response> {
		return await this._request({
			path: 'user/email/verify',
			method: 'POST',
			body: { code },
		});
	}

	/**
	 * Retrieves the Multi-Factor Authentication (MFA) status for the authenticated user.
	 *
	 * @returns {Promise<Response>} A Promise that resolves with the MFA status data.
	 */
	private async _factorStatus(): Promise<Response> {
		return await this._request({
			path: 'mfa',
		});
	}

	/**
	 * Enables Multi-Factor Authentication (MFA) for the authenticated user.
	 *
	 * @param {('totp' | 'email')} type - The MFA type to enable ('totp' for Time-based One-Time Password, 'email' for email-based MFA).
	 * @param {string | null} code - The MFA verification code (only required for 'email' MFA).
	 * @returns {Promise<Response>} A Promise that resolves with the enablement response.
	 */
	private async _enable(type: 'totp' | 'email', code: string | null = null) {
		return await this._request({
			path: `mfa/enable`,
			method: 'POST',
			body: {
				type,
				code,
			},
		});
	}

	/**
	 * Disables Multi-Factor Authentication (MFA) for the authenticated user.
	 *
	 * @param {('totp' | 'email')} type - The MFA type to disable ('totp' for Time-based One-Time Password, 'email' for email-based MFA).
	 * @param {string} code - The MFA verification code required to disable MFA.
	 * @returns {Promise<Response>} A Promise that resolves with the disabling response.
	 */
	private async _disable(
		type: 'totp' | 'email',
		code: string,
	): Promise<Response> {
		return await this._request({
			path: `mfa/disable`,
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
	 *
	 * @param {string} type - The MFA type to verify ('totp' supported for now. 'email' will be moved to this api endpoint).
	 * @param {string} code - The MFA verification code.
	 * @returns {Promise<Response>} A Promise that resolves with the verification response.
	 */
	private async _verify(type: 'totp', code: string): Promise<Response> {
		return await this._request({
			path: 'mfa/verify',
			method: 'POST',
			body: {
				type,
				code,
			},
		});
	}

	/**
	 * Requests a new Multi-Factor Authentication (MFA) email verification code for authenticated and users in sign confirm process.
	 *
	 * @returns {Promise<Response>} A Promise that resolves with the response data.
	 */
	private async _requestCode(type: string = 'email'): Promise<Response> {
		const signInInitData: SignInInit = JSON.parse(
			localStorage.getItem('sign_in_init') as string,
		);

		const body = {
			type,
			token: '',
		};

		if (signInInitData && signInInitData.token) {
			body.token = signInInitData.token;
		}

		return await this._request({
			path: 'mfa/send-code',
			method: 'POST',
			body,
		});
	}

	/**
	 * Initiates an OAuth2 authorization request to obtain consent from the authenticated user.
	 *
	 * @param {string} client_id - The client identifier.
	 * @param {string} redirect_url - The URL to redirect after approval.
	 * @param {Array} scopes - An array of requested scopes.
	 * @returns {Promise<Response>} A Promise that resolves with the authorization response.
	 */
	private async _authorize(
		client_id: string,
		redirect_url: string,
		scopes: string[],
	): Promise<Response> {
		return await this._request({
			path: 'oauth2/authorize',
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
	 *
	 * @param {string} client_id - The client identifier of the connection to be deleted.
	 * @returns {Promise<Response>} A Promise that resolves with the deletion response.
	 */
	private async _deleteConnection(client_id: string): Promise<Response> {
		return await this._request({
			path: 'oauth2/connection',
			method: 'DELETE',
			body: {
				client_id,
			},
		});
	}

	/**
	 * Retrieves an user session from local storage.
	 *
	 * @returns {Session} The user session obtained from local storage.
	 */
	getSession(): Session {
		return this._getSession();
	}

	/**
	 * Updates and retrieves user session from local storage.
	 *
	 * @returns {Session} The user session obtained from local storage.
	 */
	async updateUserInSession(): Promise<Session> {
		const session = this._getSession();

		if (!session) {
			return Promise.reject(new Error('Session is undefined'));
		}

		const user = await (await this.getUser()).json();

		const newSession: Session = {
			...session,
			user,
		};

		localStorage.setItem('session', JSON.stringify(newSession));

		return newSession;
	}

	/**
	 * Retrieves the sign in init session from local storage.
	 *
	 * @returns {SignInInit} The user sign in init session obtained from local storage.
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

		await new Promise((resolve) => setTimeout(resolve, 10));

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

			const response = await this._request({
				path: 'token',
				method: 'POST',
				body: {
					refresh_token: session.refresh_token,
				},
			});

			if (!response.ok) {
				this.signOut();
				return false;
			}

			const body = await response.json();
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

	private async _request({
		path,
		method = 'GET',
		body = undefined,
		headers = {},
	}: {
		path: string;
		method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
		body?: Record<string, any>;
		headers?: Record<string, string>;
	}): Promise<Response> {
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

		return await this.fetch(`${this.authUrl}/${path}`, options);
	}

	private _setAccessTokenToAuthHeaders(accessToken: string) {
		this.authHeaders = {
			...this.authHeaders,
			Authorization: `Bearer ${accessToken}`,
		};
	}
}
