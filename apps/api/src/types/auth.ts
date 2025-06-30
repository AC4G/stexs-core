export const possibleGrantTypes = [
  'authorization_code',
  'client_credentials',
  'refresh_token',
  'password',
  'mfa_challenge'
] as const;

export type GrantTypes = typeof possibleGrantTypes[number];

export const grantTypesRequiringClientCreds: GrantTypes[] = ['authorization_code', 'client_credentials'];
export const grantTypesRequiringCode: GrantTypes[] = ['authorization_code', 'mfa_challenge'];
export const grantTypesForPassword: GrantTypes[] = ['password'];
export const grantTypesForMFA: GrantTypes[] = ['mfa_challenge'];

export const supportedMFATypes = ['push', 'email'] as const;
export type MFATypes = typeof supportedMFATypes[number];
