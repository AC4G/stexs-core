import { z } from 'zod';

export const emailMessageSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  content: z.string().min(1),
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;
