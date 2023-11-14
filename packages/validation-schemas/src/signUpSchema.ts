import { z } from "zod";

export const signUpSchema = z.object({
  username: z.string().min(1, {
    message: 'Username must be at least 1 character long.'
  }).refine((value) => /^[A-Za-z0-9._]+$/.test(value), {
    message: 'Only letters, numbers, dots, and underscores are allowed.',
  }),
  email: z.string().email(),
  password: z.string().min(10, {
    message: 'Password must be at least 10 characters long.'
  }).refine((value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.><,?'";:\]{}=+\-_)(*^%$#@!~`])/.test(value), {
    message: 'Must include at least one uppercase letter,<br>one lowercase letter, one number, and one special character.'
  }),
  confirm: z.string(),
}).superRefine(({ confirm, password }, ctx) => {
  if (confirm !== password) {
    ctx.addIssue({
      code: "custom",
      message: "The passwords did not match",
      path: ['confirm']
    });
}});
