import { ISSUER, REDIRECT_TO_RECOVERY } from "../../env-config";

export function buildVerificationUrl(email: string, token: string): string {
	return `${ISSUER}/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

export function buildRecoveryUrl(email: string, token: string): string {
	return `${REDIRECT_TO_RECOVERY}?email=${email}&token=${token}`;
}
