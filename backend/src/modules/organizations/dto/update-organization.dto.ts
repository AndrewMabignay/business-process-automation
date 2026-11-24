import { z } from 'zod';

export const updateOrganizationSchema = z
    .object({
        name: z.string().trim().min(2).max(150).optional(),

        email: z.string().trim().email().max(255).nullable().optional(),

        status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided.',
    });

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
