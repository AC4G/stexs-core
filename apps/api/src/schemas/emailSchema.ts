import { z } from 'zod';

export const emailMessageSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  content: z.string()
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;
