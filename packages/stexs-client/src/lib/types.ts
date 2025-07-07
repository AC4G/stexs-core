export interface User {
	id: string;
	email: string;
	username: string;
	raw_user_meta_data: {
		[key: string]: any;
	};
	created_at: string;
	updated_at: string;
}

export type Session =
	| {
		access_token: string;
		expires: number;
		refresh: {
			enabled: boolean;
			count: number;
		};
		user: User;
	  }
	| undefined;

/**
 * for future multi-user implementation
 */
/*
export type Session = {
  users: {
    [userId: string]: {
      access_token: string;
      expires: number;
      refresh: {
        enabled: boolean;
        count: number;
      };
      id: string;
      email: string;
      username: string;
      raw_user_meta_data: {
        [key: string]: any;
      };
      created_at: string;
      updated_at: string;
    };
  };
  current_user: string; // User ID of the currently active user
} | undefined;
*/

export interface MessageResponse {
	success: boolean;
	message: string;
	timestamp: string;
	data: { [key: string]: any };
}

export interface ErrorResponse {
	errors: {
		code: string;
		message: string;
		data?: {
			[key: string]: any;
		};
		timestamp: string;
	}[];
}

export type RequestOptions = {
    path: string;
    method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
    body?: Record<string, any>;
    headers?: Record<string, string>;
	credentials?: 'include' | 'omit' | 'same-origin';
};

export interface MFAChallenge {
	continuousAutoRefresh: boolean;
	expires: number;
	token: string;
	types: string[];
}

export interface SignedUrl {
	url: string;
	expires: number;
}

export interface MFAChallengeResponse {
	token: string;
	types: string[];
	expires: number;
}

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires: number;
}

export interface UserResponse extends User {}

export interface SignUpResponse extends MessageResponse {}

export interface ActiveSessionsResponse {
	amount: number;
}
