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

export interface SignInInit {
  continuousAutoRefresh: boolean;
  expires: number;
  token: string;
  types: string[];
}
