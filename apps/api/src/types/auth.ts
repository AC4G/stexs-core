export const possibleGrantTypes = [
  'authorization_code',
  'client_credentials',
  'refresh_token',
  'password',
  'mfa_challenge'
] as const;

export type GrantTypes = typeof possibleGrantTypes[number];

export const grantTypesRequiringRefreshToken: Extract<GrantTypes, 'refresh_token'>[] = ['refresh_token'] as const;
export const grantTypesRequiringClientCreds: Extract<GrantTypes, 'authorization_code' | 'client_credentials'>[] = ['authorization_code', 'client_credentials'] as const;
export const grantTypesWithScopes = grantTypesRequiringClientCreds;
export const grantTypesRequiringCode: Extract<GrantTypes, 'authorization_code' | 'mfa_challenge'>[] = ['authorization_code', 'mfa_challenge'] as const;
export const grantTypesForPassword: Extract<GrantTypes, 'password'>[] = ['password'] as const;
export const grantTypesForMFA: Extract<GrantTypes, 'mfa_challenge'>[] = ['mfa_challenge'] as const;
export const grantTypesInRefreshToken: Extract<GrantTypes, 'authorization_code' | 'password'>[] = ['authorization_code', 'password'] as const;

export const supportedMFATypes = ['totp', 'email'] as const;
export type MFATypes = typeof supportedMFATypes[number];

export const supportedMFAMethods = ['email', 'totp'] as const;
export type MFAMethods = typeof supportedMFAMethods[number];

export const verifyMFAMethod: Extract<MFAMethods, 'totp'>[] = ['totp'] as const;
export const sendCodeMFAMethod: Extract<MFAMethods, 'email'>[] = ['email'] as const;
