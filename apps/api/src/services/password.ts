import { hash } from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
    return await hash(password, 12);
}
