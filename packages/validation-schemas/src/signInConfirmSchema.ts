import { z } from 'zod';

export const signInConfirmSchema = z.object({
    code: z.string()
});
