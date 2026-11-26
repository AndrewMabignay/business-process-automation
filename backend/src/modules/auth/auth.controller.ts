import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { successResponse } from '../../common/utils/api-response.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { env } from '../../config/env.js';

const authService = new AuthService(new AuthRepository());
const refreshCookieName = 'bpas_refresh_token';

function refreshCookieOptions() {
    return {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/api/auth',
    };
}

function getClientMetadata(req: Request) {
    const userAgent = req.get('user-agent');

    return {
        userAgent: userAgent ? userAgent.slice(0, 512) : undefined,
        ipAddress: req.ip ? req.ip.slice(0, 45) : undefined,
    };
}

export class AuthController {
    static async register(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const user = await authService.register(req.body);

            res.status(201).json(
                successResponse('Account registered successfully.', { user }),
            );
        } catch (error) {
            next(error);
        }
    }

    static async login(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const result = await authService.login(
                req.body,
                getClientMetadata(req),
            );

            res.cookie(refreshCookieName, result.refreshToken, {
                ...refreshCookieOptions(),
                maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
            });
            res.status(200).json(
                successResponse('Login successful.', {
                    user: result.user,
                    accessToken: result.accessToken,
                    tokenType: 'Bearer',
                    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
                }),
            );
        } catch (error) {
            next(error);
        }
    }

    static async refresh(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const refreshToken: unknown = req.cookies?.[refreshCookieName];
            const result = await authService.refresh(
                typeof refreshToken === 'string' ? refreshToken : undefined,
                getClientMetadata(req),
            );

            res.cookie(refreshCookieName, result.refreshToken, {
                ...refreshCookieOptions(),
                maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
            });
            res.status(200).json(
                successResponse('Access token refreshed.', {
                    user: result.user,
                    accessToken: result.accessToken,
                    tokenType: 'Bearer',
                    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
                }),
            );
        } catch (error) {
            next(error);
        }
    }

    static async logout(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const refreshToken: unknown = req.cookies?.[refreshCookieName];

            await authService.logout(
                typeof refreshToken === 'string' ? refreshToken : undefined,
            );
            res.clearCookie(refreshCookieName, refreshCookieOptions());
            res.status(200).json(successResponse('Logout successful.', null));
        } catch (error) {
            next(error);
        }
    }

    static async me(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (!req.auth) {
                throw new AppError(401, 'Authentication is required.');
            }

            const user = await authService.getPublicUser(req.auth.userId);
            res.status(200).json(
                successResponse('Authenticated user retrieved.', { user }),
            );
        } catch (error) {
            next(error);
        }
    }
}
