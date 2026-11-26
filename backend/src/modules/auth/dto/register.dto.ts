import { z } from 'zod';

export const registerSchema = z
    .object({
        email: z
            .string()
            .trim()
            .email()
            .max(255)
            .transform((email) => email.toLowerCase()),
        password: z
            .string()
            .min(12, 'Password must be at least 12 characters.')
            .max(128, 'Password must be at most 128 characters.'),
    })
    .strict();

export type RegisterDto = z.infer<typeof registerSchema>;
