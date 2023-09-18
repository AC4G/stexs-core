export default function isExpired(date: string, minutes: number) {
    const expiryDate = new Date(date);
    expiryDate.setMinutes(expiryDate.getMinutes() + minutes);
    return expiryDate < new Date();
}