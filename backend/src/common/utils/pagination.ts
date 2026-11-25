import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginationMetadata {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export function parsePagination(query: unknown): PaginationParams {
    const result = paginationSchema.safeParse(query);

    if (!result.success) {
        const message = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');

        throw new AppError(400, message);
    }

    return {
        ...result.data,
        skip: (result.data.page - 1) * result.data.limit,
    };
}

export function createPaginationMetadata(
    page: number,
    limit: number,
    total: number,
): PaginationMetadata {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}
