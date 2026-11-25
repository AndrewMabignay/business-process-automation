import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { errorResponse } from '../utils/api-response.js';

export function errorMiddleware(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (error instanceof AppError) {
        res.status(error.statusCode).json(errorResponse(error.message));

        return;
    }

    console.error('Unhandled application error:', error);

    res.status(500).json(errorResponse('Internal server error.'));
}
