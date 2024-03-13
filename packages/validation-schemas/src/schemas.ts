import { z } from 'zod';

const emailValidation = z.string().email();

const passwordValidation = z
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
  );

const usernameValidation = z
  .string()
  .min(1, {
    message: 'Username must be at least 1 character long.',
  })
  .max(20, {
    message: 'The username can be a maximum of 20 characters long.',
  })
  .refine((value) => /^[A-Za-z0-9._]+$/.test(value), {
    message: 'Only letters, numbers, dots, and underscores are allowed.',
  });

export const RecoveryConfirm = z
  .object({
    password: passwordValidation,
    confirm: z.string(),
  })
  .superRefine(({ confirm, password }, ctx) => {
    if (confirm !== password)
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
        path: ['confirm'],
      });
  });

export const Recovery = z.object({
  email: emailValidation,
});

export const MFA = z.object({
  code: z.string(),
});

export const SignIn = z.object({
  identifier: z.string(),
  password: z.string(),
  remember: z.boolean(),
});

export const SignUp = z
  .object({
    username: usernameValidation,
    email: emailValidation,
    password: passwordValidation,
    confirm: z.string(),
    terms: z.boolean().refine((value) => value),
  })
  .superRefine(({ confirm, password }, ctx) => {
    if (confirm !== password)
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
        path: ['confirm'],
      });
  });

export const CreateOrganization = z.object({
  name: z
    .string()
    .min(1, {
      message: 'Name must be at least 1 character long.',
    })
    .max(50, {
      message: 'The name can be a maximum of 50 characters long.',
    }),
  display_name: z
    .string()
    .max(50, {
      message: 'The display name can be a maximum of 50 characters long.',
    })
    .nullable(),
  description: z
    .string()
    .max(150, {
      message: 'The description can be a maximum of 150 characters long.',
    })
    .nullable(),
  readme: z
    .string()
    .max(10000, {
      message: 'The readme can be a maximum of 10k characters long.',
    })
    .nullable(),
  email: emailValidation.nullable(),
  url: z
    .string()
    .max(150, {
      message: 'The url can be a maximum of 150 characters long.',
    })
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.protocol === 'https:';
        } catch (e) {
          return false;
        }
      },
      {
        message: 'Url must use the HTTPS protocol',
      },
    )
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return /\.[a-zA-Z]{2,63}$/.test(url.hostname);
        } catch (e) {
          return false;
        }
      },
      {
        message: 'Url must have an ending. Example: https://example.com',
      },
    )
    .nullable(),
});

export const UpdateProfile = z.object({
  username: usernameValidation,
  url: z
    .string()
    .max(150, {
      message: 'The url can be a maximum of 150 characters long.',
    })
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.protocol === 'https:';
        } catch (e) {
          return false;
        }
      },
      {
        message: 'Url must use the HTTPS protocol',
      },
    )
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return /\.[a-zA-Z]{2,63}$/.test(url.hostname);
        } catch (e) {
          return false;
        }
      },
      {
        message: 'Url must have an ending. Example: https://example.com',
      },
    )
    .nullable(),
  bio: z
    .string()
    .max(250, {
      message: 'The bio can be a maximum of 250 characters long.',
    })
    .nullable(),
  is_private: z.boolean(),
  accept_friend_requests: z.boolean(),
});

export const UpdatePassword = z
  .object({
    password: passwordValidation,
    confirm: z.string(),
  })
  .superRefine(({ confirm, password }, ctx) => {
    if (confirm !== password)
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
        path: ['confirm'],
      });
  });

export const EmailChange = z
  .object({
    email: emailValidation
  });

export const VerifyEmailChange = z
  .object({
    code: z.string()
  });
