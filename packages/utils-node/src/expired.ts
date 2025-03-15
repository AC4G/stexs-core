export default function isExpired(date: string | Date, expirySeconds: number): boolean {
	let expiryDate: Date;

	if (typeof date === 'string') {
		expiryDate = new Date(date);
	} else {
		expiryDate = new Date(date.getTime());
	}

	const timestampNow = Math.round(Date.now() / 1000);
	const timestampExpiry = Math.round(expiryDate.getTime() / 1000) + expirySeconds;

	return timestampExpiry < timestampNow;
}
