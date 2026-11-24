import type { Request } from 'express';
import { AppError } from '../errors/app-error.js';

export function getRouteParam(req: Request, name: string): string {
    const value = req.params[name];

    if (typeof value !== 'string' || value.trim() === '') {
        throw new AppError(400, `Invalid or missing route parameter: ${name}`);
    }

    return value;
}
