export default function isExpired(date: string | Date, seconds: number): boolean {
	let expiryDate: Date;

	if (typeof date === 'string') {
		expiryDate = new Date(date);
	} else {
		expiryDate = date;
	}

	expiryDate.setMinutes(expiryDate.getSeconds() + seconds);
	return expiryDate < new Date();
}
