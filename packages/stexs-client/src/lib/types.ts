export interface Session {
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
    raw_user_meta_data: {
      username: string;
      [key: string]: any;
    };
    created_at: string;
    updated_at: string;
  };
}

/**
 * for future multi-user implementation
 */
/*
export interface Session {
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
      raw_user_meta_data: {
        username: string;
        [key: string]: any;
      };
      created_at: string;
      updated_at: string;
    };
  };
  current_user: string; // User ID of the currently active user
}
*/

export interface SignInInit {
  continuousAutoRefresh: boolean;
  expires: number;
  token: string;
  types: string[];
}
