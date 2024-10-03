import { TOTP } from 'otpauth';
import {
	SERVICE_NAME,
	TOTP_ALGORITHM,
	TOTP_DIGITS,
	TOTP_PERIOD,
} from '../../env-config';

const totpSettings = {
	algorithm: TOTP_ALGORITHM,
	digits: TOTP_DIGITS,
	period: TOTP_PERIOD,
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
