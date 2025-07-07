import { TOTP } from 'otpauth';
import { SERVICE_NAME } from '../../env-config';

const totpSettings = {
	algorithm: 'SHA256',
	digits: 6,
	period: 30,
};

export function getTOTPForSettup(label: string): TOTP {
	return new TOTP({
		issuer: SERVICE_NAME,
		label,
		...totpSettings,
	});
}

export function getTOTPForVerification(secret: string): TOTP {
	return new TOTP({
		...totpSettings,
		secret,
	});
}
