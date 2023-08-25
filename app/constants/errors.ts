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
    message: 'Provided token does not have the required grant_type.'
};
