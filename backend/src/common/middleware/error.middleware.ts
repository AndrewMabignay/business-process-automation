import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';

export function errorMiddleware(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });

        return;
    }

    console.error('Unhandled application error:', error);

    res.status(500).json({
        success: false,
        message: 'Internal server error.',
    });
}
