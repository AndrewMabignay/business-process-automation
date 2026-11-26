import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_URL: z.string().url().default('http://localhost:4200'),
    DATABASE_URL: z
        .string()
        .min(1, 'DATABASE_URL is required.')
        .url('DATABASE_URL must be a valid URL.')
        .refine(
            (value) =>
                value.startsWith('postgresql://') ||
                value.startsWith('postgres://'),
            'DATABASE_URL must use the postgresql:// or postgres:// scheme.',
        ),
    JWT_ACCESS_SECRET: z
        .string()
        .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.'),
    JWT_ISSUER: z.string().url().default('http://localhost:5000'),
    JWT_AUDIENCE: z.string().min(1).default('bpas-web'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce
        .number()
        .int()
        .min(60)
        .max(3600)
        .default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    const details = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
