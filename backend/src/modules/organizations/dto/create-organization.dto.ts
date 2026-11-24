import { z } from 'zod';

export const createOrganizationSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Organization name must be at least 2 characters.')
        .max(150),

    slug: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            'Slug must contain lowercase letters, numbers, and hyphens only.',
        ),

    email: z
        .string()
        .trim()
        .email('Invalid email address.')
        .max(255)
        .optional(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
