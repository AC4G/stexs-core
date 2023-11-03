export interface Session {
  access_token: string | null;
  refresh_token: string | null;
  refresh: {
    enabled: boolean;
    count: number;
  };
}

export interface SignInInit {
  continuousAutoRefresh: boolean;
  expires: number;
  token: string;
  types: string[];
}
