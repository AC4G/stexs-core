import { z } from 'zod';

export const signUpSchema = z
  .object({
    username: z
      .string()
      .min(1, {
        message: 'Username must be at least 1 character long.',
      })
      .max(20, {
        message: 'The username can be a maximum of 20 characters long.',
      })
      .refine((value) => /^[A-Za-z0-9._]+$/.test(value), {
        message: 'Only letters, numbers, dots, and underscores are allowed.',
      }),
    email: z.string().email(),
    password: z
      .string()
      .min(10, {
        message: 'Password must be at least 10 characters long.',
      })
      .refine((value) => /^(?=.*[a-zA-Z])/.test(value), {
        message: 'Should contain at least one upper and lower case letter.',
      })
      .refine((value) => /^(?=.*\d)/.test(value), {
        message: 'Should contain at least one number.',
      })
      .refine(
        (value) => /^(?=.*[@$!%*?&.><,?'";:\]{}=+\-_)(*^%$#@!~`])/.test(value),
        {
          message: 'Should contain at least one special character.',
        },
      ),
    confirm: z.string(),
    terms: z.boolean().refine((value) => value),
  })
  .superRefine(({ confirm, password }, ctx) => {
    if (confirm !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
        path: ['confirm'],
      });
    }
  });
