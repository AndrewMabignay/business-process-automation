import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { AuthRepository } from '../../modules/auth/auth.repository.js';
import { AuthService } from '../../modules/auth/auth.service.js';

const authService = new AuthService(new AuthRepository());

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> {
    const authorization = req.get('authorization');
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    const accessToken = match?.[1];

    if (!accessToken) {
        next(new AppError(401, 'Authentication is required.'));
        return;
    }

    try {
        req.auth = await authService.authenticateAccessToken(accessToken);
        next();
    } catch (error) {
        next(error);
    }
}
