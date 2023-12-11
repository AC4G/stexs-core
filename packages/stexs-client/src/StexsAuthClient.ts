import EventEmitter from 'events';
import { Session, SignInInit } from './lib/types';

export class StexsAuthClient {
  private authUrl: string;
  private fetch: typeof fetch;
  private authHeaders: Record<string, string>;

  private eventEmitter = new EventEmitter();

  mfa;
  oauth;

  constructor(fetch: typeof fetch, authUrl: string) {
    this.authUrl = authUrl;
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
      getConnections: this._getConnections.bind(this),
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
        method: 'POST',
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
        method: 'POST',
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
      method: string;
      body: object;
    },
    continuousAutoRefresh: boolean,
  ): Promise<Response> {
    const response = await this._request(requestParameter);

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

        if (body.types.length === 1 && body.types[0] === 'email') {
          await this._requestCode();
        }

        this._triggerEvent('SIGN_IN_INIT');
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

        this._triggerEvent('SIGNED_IN');
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
   * @returns {Promise<void>} A Promise that resolves with void.
   */
  async signOutFromAllSessions(): Promise<void> {
    await this._baseSignOut('sign-out/everywhere');
  }

  /**
   * Signs the user out based on the provided path, with optional session check and data clearing.
   *
   * @param {string} path - The path specifying the sign-out action.
   * @returns {Promise<void>} A Promise that resolves with void.
   */
  private async _baseSignOut(path: string): Promise<void> {
    const session: Session = this._getSession();

    if (session?.access_token) {
      await this._request({
        path,
        method: 'POST',
      });
    }

    localStorage.clear();

    if (this.authHeaders?.Authorization) {
      delete this.authHeaders['Authorization'];
    }

    this._triggerEvent('SIGNED_OUT');
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
      this._triggerEvent('RECOVERY');
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
  async updatePassword(password: string, code: string, type: 'totp' | 'email'): Promise<Response> {
    return await this._request({
      path: 'user/password',
      method: 'POST',
      body: { 
        password,
        code, 
        type
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
  async changeEmail(email: string, code: string, type: 'totp' | 'email'): Promise<Response> {
    return await this._request({
      path: 'user/email',
      method: 'POST',
      body: { 
        email,
        code,
        type
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
    const response = await this._request({
      path: 'user/email/verify',
      method: 'POST',
      body: { code },
    });

    if (response.ok) {
      this._triggerEvent('USER_UPDATED');
    }

    return response;
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
   * @param {string | null} code - The MFA verification code (required for 'email' MFA).
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
   * @param {string} code - The MFA verification code.
   * @returns {Promise<Response>} A Promise that resolves with the verification response.
   */
  private async _verify(code: string): Promise<Response> {
    return await this._request({
      path: 'mfa/verify',
      method: 'POST',
      body: {
        type: 'totp',
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
   * Retrieves the OAuth2 connections associated with the authenticated user.
   *
   * @returns {Promise<Response>} A Promise that resolves with the connections response.
   */
  private async _getConnections(): Promise<Response> {
    return await this._request({
      path: 'oauth2/connections',
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
   * Retrieves a user session from local storage.
   *
   * @returns {Session} The user session obtained from local storage.
   */
  getSession(): Session {
    return this._getSession();
  }

  /**
   * Retrieves the sign in init session from local storage.
   *
   * @returns {SignInInit} The user sign in init session obtained from local storage.
   */
  getSignInInit(): SignInInit {
    return this._getSignInInit();
  }

  onAuthStateChange(callback: (event: string) => void) {
    this.eventEmitter.on('SIGNED_IN', () => {
      callback('SIGNED_IN');
    });

    this.eventEmitter.on('SIGN_IN_INIT', () => {
      callback('SIGN_IN_INIT');
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

  private async _scheduleTokenRefresh() {
    const refreshThresholdMs = 60000;

    while (true) {
      const session: Session = this._getSession();

      if (session && session.expires) {
        const expiresInMs = session.expires * 1000 - Date.now();

        if (expiresInMs > refreshThresholdMs) {
          const delayMs = expiresInMs - refreshThresholdMs;

          setTimeout(async () => {
            const session: Session = this._getSession();

            if (session) {
              await this._refreshAccessToken();
            }
          }, delayMs);
        }

        if (expiresInMs < refreshThresholdMs) {
          await this._refreshAccessToken();
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 55 * 60 * 1000));
    }
  }

  private async _refreshAccessToken(): Promise<boolean> {
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

    const user = await (await this.getUser()).json();

    localStorage.setItem(
      'session',
      JSON.stringify({
        ...body,
        refresh,
        user,
      }),
    );

    this._triggerEvent('TOKEN_REFRESHED');

    return true;
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
    method?: string;
    body?: object;
    headers?: Record<string, string>;
  }): Promise<Response> {
    try {
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
    } catch (e) {
      throw e;
    }
  }

  private _setAccessTokenToAuthHeaders(accessToken: string) {
    this.authHeaders = {
      ...this.authHeaders,
      Authorization: `Bearer ${accessToken}`,
    };
  }
}
