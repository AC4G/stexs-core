import EventEmitter from 'events';
import type {
	ErrorResponse,
	TokenResponse,
	Session,
	MFAChallenge,
	MFAChallengeResponse,
	UserResponse,
	RequestOptions,
	SignUpResponse,
	ActiveSessionsResponse,
} from './lib/types';
import { ApiResponse } from './lib/apiResponse';

export enum AuthEvents {
	SIGNED_IN = 'SIGNED_IN',
	MFA_CHALLENGE = 'MFA_CHALLENGE',
	SIGNED_OUT = 'SIGNED_OUT',
	TOKEN_REFRESHED = 'TOKEN_REFRESHED',
	USER_UPDATED = 'USER_UPDATED',
	RECOVERY = 'RECOVERY',
}

export enum ApiAuthRoutes {
	SIGN_UP = '/auth/sign-up',
	SIGN_IN = '/auth/token?grant_type=password',
	MFA_CHALLENGE = '/auth/token?grant_type=mfa_challenge',
	REFRESH_TOKEN = '/auth/token?grant_type=refresh_token',

	SIGN_OUT = '/auth/sign-out',
	SIGN_OUT_ALL_SESSIONS = '/auth/sign-out/all-sessions',

	USER = '/auth/user',
	USER_SESSIONS = '/auth/user/sessions',
	USER_PASSWORD = '/auth/user/password',
	USER_EMAIL = '/auth/user/email',
	USER_EMAIL_VERIFY = '/auth/user/email/verify',
	
	VERIFY_RESEND = '/auth/verify/resend',

	MFA_STATUS = '/auth/mfa',
	MFA_VERIFY = '/auth/mfa/verify',
	MFA_SEND_CODE = '/auth/mfa/send-code',
	MFA_ENABLE = '/auth/mfa/enable',
	MFA_DISABLE = '/auth/mfa/disable',

	OAUTH2_AUTHORIZE = '/auth/oauth2/authorize',
	OAUTH2_CONNECTIONS = '/auth/oauth2/connections',

	RECOVERY = '/auth/recovery',
	RECOVERY_CONFIRM = '/auth/recovery/confirm',
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
	private refreshThreshhold = 2 * 60 * 1000; // 2min
	private refreshRetryCount = 0;
	private refreshRetryDelay = 1000; // 10s

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
		const mfaChallenge: MFAChallenge = this._getMFAChallenge();

		if (session && session.access_token) {
			this._setAccessTokenToAuthHeaders(session.access_token);
		}

		if (mfaChallenge && new Date(mfaChallenge.expires * 1000) < new Date()) {
			localStorage.removeItem('mfa_challenge');
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
	): Promise<ApiResponse<MFAChallengeResponse>> {
		const response = await this._request<MFAChallengeResponse>({
			path: ApiAuthRoutes.SIGN_IN,
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
			'mfa_challenge',
			JSON.stringify({
				...body,
				continuousAutoRefresh,
			}),
		);

		// subject to change in the future
		if (body.types.length === 1 && body.types[0] === 'email') {
			await this._requestCode();
		}

		this.triggerEvent(AuthEvents.MFA_CHALLENGE);

		return response;
	}

	/**
	 * Confirms the user's Multi-Factor Authentication (MFA) sign-in with the provided type and MFA code.
	 */
	async mfaChallenge(type: string, code: string): Promise<ApiResponse<TokenResponse>> {
		const mfaChallengeData: MFAChallenge = JSON.parse(
			localStorage.getItem('mfa_challenge') as string,
		) as MFAChallenge;

		if (!mfaChallengeData) {
			throw new Error('MFA challenge initialization data not found.');
		}

		const { token, expires, continuousAutoRefresh } = mfaChallengeData;

		if (!token) {
			throw new Error('MFA challenge token was not found.');
		}

		if (Number(expires) < Date.now() / 1000) {
			throw new Error('MFA challenge token has expired.');
		}

		const response = await this._request<TokenResponse>({
			path: ApiAuthRoutes.MFA_CHALLENGE,
			body: {
				code,
				type,
				token,
			},
		});

		if (!response.ok) {
			return response;
		}

		localStorage.removeItem('mfa_challenge');

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

		return response;
	}

	/**
	 *  Deletes the MFA challenge session from localStorage
	 */
	cancelMFAChallengeConfirm() {
		localStorage.removeItem('mfa_challenge');
	}

	/**
	 * Initiates the user signup process with the provided username, email, and password.
	 */
	async signUp(
		username: string,
		email: string,
		password: string,
	): Promise<ApiResponse<SignUpResponse>> {
		return this._request({
			path: ApiAuthRoutes.SIGN_UP,
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
	async getActiveSessionsAmount(): Promise<ApiResponse<ActiveSessionsResponse>> {
		return this._request({
			path: ApiAuthRoutes.USER_SESSIONS,
			method: 'GET',
		});
	}

	/**
	 * Signs the user out from the current session.
	 */
	async signOut(): Promise<void> {
		await this._baseSignOut(ApiAuthRoutes.SIGN_OUT);
	}

	/**
	 * Signs the user out from all active sessions.
	 */
	async signOutFromAllSessions(
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return this._baseSignOut(ApiAuthRoutes.SIGN_OUT_ALL_SESSIONS, {
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
		if (this.refreshTimeoutId) {
			clearTimeout(this.refreshTimeoutId);
			this.refreshTimeoutId = null;
		}

		const response = await this._request({
			path,
			method: 'POST',
			body,
		});

		this.refreshRetryCount = 0;
		this.refreshRetryDelay = 1000;

		localStorage.removeItem('session');
		localStorage.removeItem('mfa_challenge');

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
		return this._request({
			path: ApiAuthRoutes.VERIFY_RESEND,
			method: 'POST',
			body: { email },
		});
	}

	/**
	 * Initiates the password recovery process.
	 */
	async recovery(email: string): Promise<Response> {
		const response = await this._request({
			path: ApiAuthRoutes.RECOVERY,
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
		return this._request({
			path: ApiAuthRoutes.RECOVERY_CONFIRM,
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
	async getUser(): Promise<ApiResponse<UserResponse>> {
		return this._request<UserResponse>({ path: ApiAuthRoutes.USER });
	}

	/**
	 * Changes the password of the authenticated user with the provided password.
	 */
	async changePassword(
		password: string,
		code: string,
		type: 'totp' | 'email',
	): Promise<Response> {
		return this._request({
			path: ApiAuthRoutes.USER_PASSWORD,
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
		return this._request({
			path: ApiAuthRoutes.USER_EMAIL,
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
		return this._request({
			path: ApiAuthRoutes.USER_EMAIL_VERIFY,
			method: 'POST',
			body: { code },
		});
	}

	/**
	 * Retrieves the Multi-Factor Authentication (MFA) status for the authenticated user.
	 */
	private async _factorStatus(): Promise<Response> {
		return this._request({
			path: ApiAuthRoutes.MFA_STATUS,
		});
	}

	/**
	 * Enables Multi-Factor Authentication (MFA) for the authenticated user.
	 */
	private async _enable(type: 'totp' | 'email', code: string | null = null): Promise<Response> {
		return this._request({
			path: ApiAuthRoutes.MFA_ENABLE,
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
		return this._request({
			path: ApiAuthRoutes.MFA_DISABLE,
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
		return this._request({
			path: ApiAuthRoutes.MFA_VERIFY,
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
		const mfaChallengeData: MFAChallenge = JSON.parse(
			localStorage.getItem('mfa_challenge') as string,
		);

		const body = {
			type
		};

		if (mfaChallengeData && mfaChallengeData.token) {
			body['token'] = mfaChallengeData.token;
		}

		return this._request({
			path: ApiAuthRoutes.MFA_SEND_CODE,
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
		return this._request({
			path: ApiAuthRoutes.OAUTH2_AUTHORIZE,
			method: 'POST',
			body: {
				client_id,
				redirect_url,
				scopes,
			},
		});
	}

	/**
	 * Deletes the connection with the provided connection id.
	 */
	private async _deleteConnection(connectionId: string): Promise<Response> {
		return this._request({
			path: ApiAuthRoutes.OAUTH2_CONNECTIONS + `/${connectionId}`,
			method: 'DELETE',
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
	getMFAChallenge(): MFAChallenge {
		return this._getMFAChallenge();
	}

	onAuthStateChange(callback: (event: AuthEvents) => void) {
		this.eventEmitter.on(AuthEvents.SIGNED_IN, () => {
			callback(AuthEvents.SIGNED_IN);
		});

		this.eventEmitter.on(AuthEvents.MFA_CHALLENGE, () => {
			callback(AuthEvents.MFA_CHALLENGE);
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
					this.refreshTimeoutId = null;
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

			await new Promise((resolve) => setTimeout(resolve, 25 * 60 * 1000)); // 25min
		}
	}

	private async _refreshAccessToken(): Promise<boolean> {
		const isLocked = localStorage.getItem('refresh_lock') === 'true';
		const currentTabId = Date.now();

		if (isLocked) return false;

		localStorage.setItem('refresh_lock', 'true');
		localStorage.setItem('priority_tab', currentTabId.toString());

		await new Promise((r) => setTimeout(r, 1));

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
			if (!session) return false;

			if (session.refresh.count === 24) {
				this.signOut();
				return false;
			}

			const response = await this._request<TokenResponse>({
				path: ApiAuthRoutes.REFRESH_TOKEN,
				method: 'POST',
				credentials: 'include',
			});

			if (!response.ok) throw new Error('Failed to refresh token');

			const body = await response.getSuccessBody();
			const refresh = { ...session.refresh };

			this._setAccessTokenToAuthHeaders(body.access_token);

			if (refresh.enabled === false) refresh.count++;

			localStorage.setItem(
				'session',
				JSON.stringify({
					...body,
					refresh,
					user: session.user,
				}),
			);

			this.triggerEvent(AuthEvents.TOKEN_REFRESHED);

			this.refreshRetryCount = 0;
			this.refreshRetryDelay = 1000;

			return true;
		} catch (error) {
			console.error('Error refreshing access token:', error);

			this.refreshRetryCount = (this.refreshRetryCount ?? 0) + 1;

			if (this.refreshRetryCount <= 5) {
				setTimeout(() => this._refreshAccessToken(), this.refreshRetryDelay);
				this.refreshRetryDelay = this.refreshRetryDelay * 2;
			} else {
				console.warn('Max refresh retries reached. Signing out.');
				this.signOut();
			}

			return false;
		} finally {
			localStorage.removeItem('refresh_lock');
			localStorage.removeItem('priority_tab');
		}
	}

	private _getSession(): Session {
		return JSON.parse(localStorage.getItem('session') as string) as Session;
	}

	private _getMFAChallenge(): MFAChallenge {
		return JSON.parse(
			localStorage.getItem('mfa_challenge') as string,
		) as MFAChallenge;
	}

	private async _request<TSuccess, TError = ErrorResponse>(
		options: RequestOptions,
	): Promise<ApiResponse<TSuccess, TError>> {
		const {
			path,
			method = 'GET',
			body,
			headers,
			credentials,
		} = options;
		const requestInit: RequestInit = {
			method,
			headers: {
				'Content-Type': 'application/json',
				...this.authHeaders,
				...headers,
			},
			credentials,
		};

		if (method !== 'GET' && body !== null) {
			requestInit.body = JSON.stringify(body);
		}

		const response = await this.fetch(`${this.authUrl}${path}`, requestInit);

  		return new ApiResponse<TSuccess, TError>(response);
	}

	private _setAccessTokenToAuthHeaders(accessToken: string) {
		this.authHeaders = {
			...this.authHeaders,
			Authorization: `Bearer ${accessToken}`,
		};
	}
}
