import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';

export function verifyOrigin(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const origin = req.get('origin');

    if (origin && origin !== env.CLIENT_URL) {
        next(new AppError(403, 'Request origin is not allowed.'));
        return;
    }

    next();
}
