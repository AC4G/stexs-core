export type Session =
	| {
			access_token: string;
			refresh_token: string;
			expires: number;
			refresh: {
				enabled: boolean;
				count: number;
			};
			user: {
				id: string;
				email: string;
				username: string;
				raw_user_meta_data: {
					[key: string]: any;
				};
				created_at: string;
				updated_at: string;
			};
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
      refresh_token: string;
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

export interface SignInInit {
	continuousAutoRefresh: boolean;
	expires: number;
	token: string;
	types: string[];
}

export interface SignedUrl {
	url: string;
	expires: number;
}

export type AvatarCache = {
	ETag: string;
	objectUrl: string;
};
