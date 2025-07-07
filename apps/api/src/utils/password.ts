import { hash, compare } from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
    return await hash(password, 12);
}

export async function verifyPassword(password: string, encryptedPassword: string): Promise<boolean> {
    return await compare(password, encryptedPassword);
}
