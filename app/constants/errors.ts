export const USERNAME_REQUIRED = {
    code: 'USERNAME_REQUIRED',
    message: 'Please provide a username.'
};
export const INVALID_USERNAME = {
    code: 'INVALID_USERNAME',
    messages: [
        'Username can be minimum 1 and maximum 20 characters long.',
        'Username cannot look like an email address!'
    ]
};
export const EMAIL_REQUIRED = {
    code: 'EMAIL_REQUIRED',
    message: 'Please provide an email.'
};
export const INVALID_EMAIL = {
    code: 'INVALID_EMAIL',
    messages: [
        'Please provide a valid email address.',
        'Please choose a different email address.'
    ]
};
export const PASSWORD_REQUIRED = {
    code: 'PASSWORD_REQUIRED',
    message: 'Please provide an password.'
};
export const INVALID_PASSWORD = {
    code: 'INVALID_PASSWORD',
    message: 'Your password must contain at least one uppercase letter, one lowercase letter, one number, and one special character!'
};
export const INVALID_INPUT_DATA = {
    code: 'INVALID_INPUT_DATA',
    message: 'Provided data are invalid.'
};
export const INVALID_REQUEST = { 
    code: 'INVALID_REQUEST',
    message: 'Cannot process the request.'
};
export const IDENTIFIER_REQUIRED = {
    code: 'IDENTIFIER_REQUIRED',
    message: 'Please provide username or email.'
};
export const INVALID_CREDENTIALS = {
    code: 'INVALID_CREDENTIALS',
    messages: [
        'Invalid credentials. Please check your username/email and password.'
    ]
};
export const EMAIL_NOT_VERIFIED = {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Please verify your email before proceeding.'
};
export const INVALID_TOKEN = {
    code: 'INVALID_TOKEN',
    message: 'Invalid token provided.'
};
export const TOKEN_REQUIRED = {
    code: 'TOKEN_REQUIRED',
    message: 'Please provide the verification token from your email.'
};
export const EMAIL_NOT_FOUND = {
    code: 'EMAIL_NOT_FOUND',
    message: 'Email address not found.'
};
export const EMAIL_ALREADY_VERIFIED = {
    code: 'EMAIL_ALREADY_VERIFIED',
    message: 'Your email has been already verified.'
};
export const CREDENTIALS_REQUIRED = {
    code: 'CREDENTIALS_REQUIRED',
    messages: [
        'No authorization token was found'
    ]
};
export const CREDENTIALS_BAD_FORMAT = {
    code: 'CREDENTIALS_BAD_FORMAT',
    messages: [
        'Format is Authorization: Bearer [token]'
    ]
};
export const USER_NOT_FOUND = {
    code: 'USER_NOT_FOUND',
    message: 'User was not been found.'
};
export const PASSWORD_CHANGE_FAILED = {
    code: 'PASSWORD_CHANGE_FAILED',
    message: 'Password change failed.'
};
export const INTERNAL_ERROR = {
    code: 'INTERNAL_ERROR',
    message: 'An internal error occorred.'
};
export const INVALID_GRANT_TYPE = {
    code: 'INVALID_GRANT_TYPE',
    messages: [
        'Provided token does not have the required grant type.',
        'Provided grant type is invalid.'
    ]
};
export const GRANT_TYPE_REQUIRED = {
    code: 'GRANT_TYPE_REQUIRED',
    message: 'Please provide a grand type.'
};
export const CLIENT_ID_REQUIRED = {
    code: 'CLIENT_ID_REQUIRED',
    message: 'Please provide a client id.'
};
export const CLIENT_SECRET_REQUIRED = {
    code: 'CLIENT_SECRET_REQUIRED',
    message: 'Please provide a client secret.'
};
export const REDIRECT_URL_REQUIRED = {
    code: 'REDIRECT_URL_REQUIRED',
    message: 'Please provide a redirect url.'
};
export const INVALID_URL = {
    code: 'INVALID_URL',
    message: 'Please provide a valid url.'
};
export const SCOPES_REQUIRED = {
    code: 'SCOPES_REQUIRED',
    message: 'Please provide scopes.'
};
export const ARRAY_REQUIRED = {
    code: 'ARRAY_REQUIRED',
    message: 'Please provide an array.'
};
export const EMPTY_ARRAY = {
    code: 'EMPTY_ARRAY',
    message: 'Array cannot be empty.'
};
export const CLIENT_NOT_FOUND = {
    code: 'CLIENT_NOT_FOUND',
    message: 'Client not found or invalid combination of client_id, redirect_url and scopes.'
};
export const CLIENT_ALREADY_CONNECTED = {
    code: 'CLIENT_ALREADY_CONNECTED',
    message: 'Given client is already connected with the user.'
};
export const CODE_REQUIRED = {
    code: 'CODE_REQUIRED',
    message: 'Please provide a code.'
};
export const REFRESH_TOKEN_REQUIRED = {
    code: 'REFRESH_TOKEN_REQUIRED',
    message: 'Please provide a refresh token.'
};
export const INVALID_AUTHORIZATION_CODE = {
    code: 'INVALID_AUTHORIZATION_CODE',
    message: 'Authorization code or client credentials are invalid.'
};
export const INVALID_CLIENT_ID_FORMAT = {
    code: 'INVALID_CLIENT_ID_FORMAT',
    message: 'Client id must be in uuid format.'
};
export const INVALID_REFRESH_TOKEN = {
    code: 'INVALID_REFRESH_TOKEN',
    message: 'Provided refresh token is invalid.'
};
export const INVALID_CLIENT_CREDENTIALS = {
    code: 'INVALID_CLIENT_CREDENTIALS',
    message: 'Provided client credentials are invalid.'
};
export const NO_CLIENT_SCOPES_SELECTED = {
    code: 'NO_CLIENT_SCOPES_SELECTED',
    message: 'No scopes for client credentials grant selected for this client.'
};
export const CODE_EXPIRED = {
    code: 'CODE_EXPIRED',
    message: 'The provided authorization code has expired.'
};
export const CONNECTION_ALREADY_DELETED = {
    code: 'CONNECTION_ALREADY_DELETED',
    message: 'Provided client connection already deleted.'
}
export const CONNECTION_ALREADY_REVOKED = {
    code: 'CONNECTION_ALREADY_REVOKED',
    message: 'Connection not found or is already revoked for the given refresh token.'
};
