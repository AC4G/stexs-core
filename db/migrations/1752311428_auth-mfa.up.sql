CREATE TABLE auth.mfa (
	user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
	email BOOLEAN DEFAULT TRUE NOT NULL,
	totp_secret VARCHAR(32),
	totp_verified_at TIMESTAMPTZ,
	email_code VARCHAR(8),
	email_code_sent_at TIMESTAMPTZ
);
