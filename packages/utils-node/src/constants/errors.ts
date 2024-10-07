export const USERNAME_REQUIRED = {
	code: 'USERNAME_REQUIRED',
	message: 'Please provide a username.',
};
export const USER_ID_REQUIRED = {
	code: 'USER_ID_REQUIRED',
	message: 'Please provide a user id.',
};
export const INVALID_USERNAME = {
	code: 'INVALID_USERNAME',
	messages: [
		'Username can be minimum 1 and maximum 20 characters long.',
		'Username cannot look like an email address!',
		'Please enter only letters, numbers, dots, and underscores.',
	],
}; 
export const EMAIL_REQUIRED = {
	code: 'EMAIL_REQUIRED',
	message: 'Please provide an email.',
};
export const INVALID_EMAIL = {
	code: 'INVALID_EMAIL',
	messages: [
		'Please provide a valid email address.',
		'Please choose a different email address.',
	],
};
export const PASSWORD_REQUIRED = {
	code: 'PASSWORD_REQUIRED',
	message: 'Please provide an password.',
};
export const INVALID_PASSWORD = {
	code: 'INVALID_PASSWORD',
	message:
		'Your password must contain at least one uppercase letter, one lowercase letter, one number, and one special character!',
};
export const INVALID_PASSWORD_LENGTH = {
	code: 'INVALID_PASSWORD_LENGTH',
	message: 'Please choose a password that is at least 10 characters long.',
};
export const INVALID_INPUT_DATA = {
	code: 'INVALID_INPUT_DATA',
	message: 'Provided data are invalid.',
};
export const INVALID_REQUEST = {
	code: 'INVALID_REQUEST',
	message: 'Cannot process the request.',
};
export const IDENTIFIER_REQUIRED = {
	code: 'IDENTIFIER_REQUIRED',
	message: 'Please provide username or email.',
};
export const INVALID_CREDENTIALS = {
	code: 'INVALID_CREDENTIALS',
	messages: ['Invalid credentials. Verify your username/email and password.'],
};
export const EMAIL_NOT_VERIFIED = {
	code: 'EMAIL_NOT_VERIFIED',
	message: 'Please verify your email before proceeding.',
};
export const INVALID_TOKEN = {
	code: 'INVALID_TOKEN',
	message: 'Invalid token provided.',
};
export const TOKEN_REQUIRED = {
	code: 'TOKEN_REQUIRED',
	message: 'Please provide the verification token from your email.',
};
export const EMAIL_NOT_FOUND = {
	code: 'EMAIL_NOT_FOUND',
	message: 'Email address not found.',
};
export const EMAIL_ALREADY_VERIFIED = {
	code: 'EMAIL_ALREADY_VERIFIED',
	message: 'Your email has been already verified.',
};
export const CREDENTIALS_REQUIRED = {
	code: 'CREDENTIALS_REQUIRED',
	message: 'No authorization token was found',
};
export const CREDENTIALS_BAD_FORMAT = {
	code: 'CREDENTIALS_BAD_FORMAT',
	message: 'Format is Authorization: Bearer [token]',
};
export const USER_NOT_FOUND = {
	code: 'USER_NOT_FOUND',
	message: 'User was not been found.',
};
export const PASSWORD_CHANGE_FAILED = {
	code: 'PASSWORD_CHANGE_FAILED',
	message: 'Password change failed.',
};
export const INTERNAL_ERROR = {
	code: 'INTERNAL_ERROR',
	message: 'An internal error occorred.',
};
export const INVALID_GRANT_TYPE = {
	code: 'INVALID_GRANT_TYPE',
	messages: [
		'Provided token does not have the required grant type.',
		'Provided grant type is invalid.',
	],
};
export const GRANT_TYPE_REQUIRED = {
	code: 'GRANT_TYPE_REQUIRED',
	message: 'Please provide a grand type.',
};
export const CLIENT_ID_REQUIRED = {
	code: 'CLIENT_ID_REQUIRED',
	message: 'Please provide a client id.',
};
export const CLIENT_SECRET_REQUIRED = {
	code: 'CLIENT_SECRET_REQUIRED',
	message: 'Please provide a client secret.',
};
export const REDIRECT_URL_REQUIRED = {
	code: 'REDIRECT_URL_REQUIRED',
	message: 'Please provide a redirect url.',
};
export const INVALID_URL = {
	code: 'INVALID_URL',
	message: 'Please provide a valid url.',
};
export const SCOPES_REQUIRED = {
	code: 'SCOPES_REQUIRED',
	message: 'Please provide scopes.',
};
export const ARRAY_REQUIRED = {
	code: 'ARRAY_REQUIRED',
	message: 'Please provide an array.',
};
export const EMPTY_ARRAY = {
	code: 'EMPTY_ARRAY',
	message: 'Array cannot be empty.',
};
export const CLIENT_NOT_FOUND = {
	code: 'CLIENT_NOT_FOUND',
	message:
		'Client not found or invalid combination of client_id, redirect_url and scopes.',
};
export const CLIENT_ALREADY_CONNECTED = {
	code: 'CLIENT_ALREADY_CONNECTED',
	message: 'Given client is already connected with the user.',
};
export const CODE_REQUIRED = {
	code: 'CODE_REQUIRED',
	message: 'Please provide a code.',
};
export const REFRESH_TOKEN_REQUIRED = {
	code: 'REFRESH_TOKEN_REQUIRED',
	message: 'Please provide a refresh token.',
};
export const INVALID_AUTHORIZATION_CODE = {
	code: 'INVALID_AUTHORIZATION_CODE',
	message: 'Authorization code or client credentials are invalid.',
};
export const INVALID_REFRESH_TOKEN = {
	code: 'INVALID_REFRESH_TOKEN',
	message: 'Provided refresh token is invalid.',
};
export const INVALID_CLIENT_CREDENTIALS = {
	code: 'INVALID_CLIENT_CREDENTIALS',
	message: 'Provided client credentials are invalid.',
};
export const NO_CLIENT_SCOPES_SELECTED = {
	code: 'NO_CLIENT_SCOPES_SELECTED',
	message: 'No scopes for client credentials grant selected for this client.',
};
export const CODE_EXPIRED = {
	code: 'CODE_EXPIRED',
	message: 'The provided code has expired.',
};
export const CONNECTION_NOT_FOUND = {
	code: 'CONNECTION_NOT_FOUND',
	message: 'Provided client connection not found.',
};
export const CONNECTION_ALREADY_REVOKED = {
	code: 'CONNECTION_ALREADY_REVOKED',
	message:
		'Connection not found or is already revoked for the given refresh token.',
};
export const ROUTE_NOT_FOUND = {
	code: 'ROUTE_NOT_FOUND',
	message: "Requested route doesn't exists.",
};
export const NEW_PASSWORD_EQUALS_CURRENT = {
	code: 'NEW_PASSWORD_EQUALS_CURRENT',
	message: "New password can't be the same as the current password.",
};
export const RECOVERY_LINK_EXPIRED = {
	code: 'RECOVERY_LINK_EXPIRED',
	message: 'Recovery link expired. Please request a new recovery link.',
};
export const EMAIL_CHANGE_LINK_EXPIRED = {
	code: 'EMAIL_CHANGE_LINK_EXPIRED',
	message:
		'Email change link expired. Please go through the same process of changing your email again.',
};
export const UUID_REQUIRED = {
	code: 'UUID_REQUIRED',
	message: 'Please provide a uuid.',
};
export const INVALID_UUID = {
	code: 'INVALID_UUID',
	message: 'Please provide a valid uuid.',
};
export const TYPE_REQUIRED = {
	code: 'TYPE_REQUIRED',
	message: 'Please provide a type.',
};
export const INVALID_TYPE = {
	code: 'INVALID_TYPE',
	message: 'Provided type is invalid.',
};
export const UNSUPPORTED_TYPE = {
	code: 'UNSUPPORTED_TYPE',
	message: "Provided type isn't supported.",
};
export const INVALID_CODE = {
	code: 'INVALID_CODE',
	message: 'Provided code is invalid.',
};
export const TOTP_ALREADY_ENABLED = {
	code: 'TOTP_ALREADY_ENABLED',
	message: 'TOTP MFA is already enabled.',
};
export const TOTP_ALREADY_DISABLED = {
	code: 'TOTP_ALREADY_DISABLED',
	message: 'TOTP MFA is already disabled.',
};
export const TOTP_ALREADY_VERIFIED = {
	code: 'TOTP_ALREADY_VERIFIED',
	message: 'TOTP MFA is already verified.',
};
export const TOTP_DISABLED = {
	code: 'TOTP_DISABLED',
	message: "You can't use the MFA TOTP method because it is disabled.",
};
export const MFA_EMAIL_ALREADY_ENABLED = {
	code: 'MFA_EMAIL_ALREADY_ENABLED',
	message: 'Email MFA is already enabled.',
};
export const MFA_EMAIL_ALREADY_DISABLED = {
	code: 'MFA_EMAIL_ALREADY_DISABLED',
	message: 'Email MFA is already disabled.',
};
export const MFA_EMAIL_DISABLED = {
	code: 'MFA_EMAIL_DISABLED',
	message: "You can't use the MFA email method because it is disabled.",
};
export const MFA_CANNOT_BE_COMPLETELY_DISABLED = {
	code: 'MFA_CANNOT_BE_COMPLETELY_DISABLED',
	message: 'MFA cannot be disabled completely from the account.',
};
export const UNAUTHORIZED_ACCESS = {
	code: 'UNAUTHORIZED_ACCESS',
	message: 'You are not authorized to access this resource.',
};
export const ITEM_ID_REQUIRED = {
	code: 'ITEM_ID_REQUIRED',
	message: 'Please provide a item id.',
};
export const ITEM_ID_NOT_NUMERIC = {
	code: 'ITEM_ID_NOT_NUMERIC',
	message: 'Item id needs to be a number.',
};
export const PROJECT_ID_REQUIRED = {
	code: 'PROJECT_ID_REQUIRED',
	message: 'Please provide a project id.',
};
export const PROJECT_ID_NOT_NUMERIC = {
	code: 'PROJECT_ID_NOT_NUMERIC',
	message: 'Project id needs to be a number.',
};
export const ORGANIZATION_ID_REQUIRED = {
	code: 'ORGANIZATION_ID_REQUIRED',
	message: 'Please provide a organization id.',
};
export const ORGANIZATION_ID_NOT_NUMERIC = {
	code: 'ORGANIZATION_ID_NOT_NUMERIC',
	message: 'Organization id needs to be a number.',
};
export const INSUFFICIENT_SCOPES = {
	code: 'INSUFFICIENT_SCOPES',
	message:
		'Provided token has insufficient scopes for accessing the requested endpoint.',
};
export const ACCOUNT_BANNED = {
	code: 'ACCOUNT_BANNED',
	message:
		'Your account is banned. If you believe you have been wrongly banned, please contact the support.',
};
export const CONNECTION_ID_NOT_NUMERIC = {
	code: 'CONNECTION_ID_NOT_NUMER',
	message: 'Connection id needs to be a number.',
};
export const CONNECTION_ID_REQUIRED = {
	code: 'CONNECTION_ID_REQUIRED',
	message: 'Please provide a connection id.',
};
export const EMAIL_NOT_AVAILABLE = {
	code: 'EMAIL_NOT_AVAILABLE',
	message: 'Please provide a different email address.',
};
export const INVALID_REDIRECT_URL = {
	code: 'INVALID_REDIRECT_URL',
	message: 'Please provide the right redirect url as specified in client settings.',
};
export const INVALID_SCOPES = {
	code: 'INVALID_SCOPES',
	message: 'Please provide only the scopes that are specified in client settings.',
};
