import argon2 from 'argon2';
import type { HashOptions } from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { AuthRepository } from './auth.repository.js';

const passwordHashOptions: HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
};
const dummyPasswordHash = argon2.hash(
    randomBytes(32).toString('base64url'),
    passwordHashOptions,
);

const accessTokenClaimsSchema = z.object({
    sub: z.string().uuid(),
    sid: z.string().uuid(),
    jti: z.string().uuid(),
    exp: z.number(),
});

export interface ClientMetadata {
    userAgent?: string;
    ipAddress?: string;
}

function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function createRefreshToken(): { token: string; jti: string; hash: string } {
    const token = randomBytes(32).toString('base64url');

    return {
        token,
        jti: randomUUID(),
        hash: hashRefreshToken(token),
    };
}

function createAccessToken(userId: string, sessionId: string): string {
    return jwt.sign({ sid: sessionId }, env.JWT_ACCESS_SECRET, {
        algorithm: 'HS256',
        audience: env.JWT_AUDIENCE,
        expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
        issuer: env.JWT_ISSUER,
        jwtid: randomUUID(),
        subject: userId,
    });
}

function hasPrismaErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === code
    );
}

export class AuthService {
    constructor(private readonly authRepository: AuthRepository) {}

    async register(data: RegisterDto) {
        const passwordHash = await argon2.hash(
            data.password,
            passwordHashOptions,
        );

        try {
            return await this.authRepository.createUser({
                email: data.email,
                passwordHash,
            });
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2002')) {
                throw new AppError(
                    409,
                    'An account with this email already exists.',
                );
            }

            throw error;
        }
    }

    async login(data: LoginDto, client: ClientMetadata) {
        const user = await this.authRepository.findUserForLogin(data.email);

        const passwordMatches = user
            ? await argon2.verify(user.passwordHash, data.password)
            : await argon2.verify(await dummyPasswordHash, data.password);

        if (!user || !passwordMatches || user.status !== 'ACTIVE') {
            throw new AppError(401, 'Invalid email or password.');
        }

        const now = new Date();
        const expiresAt = new Date(
            now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        );
        const refreshToken = createRefreshToken();
        const session = await this.authRepository.createSession({
            userId: user.id,
            refreshTokenJti: refreshToken.jti,
            refreshTokenHash: refreshToken.hash,
            expiresAt,
            ...client,
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                status: user.status,
                createdAt: user.createdAt,
            },
            accessToken: createAccessToken(user.id, session.id),
            refreshToken: refreshToken.token,
        };
    }

    async refresh(token: string | undefined, client: ClientMetadata) {
        if (!token || token.length > 128) {
            throw new AppError(401, 'Invalid or expired refresh token.');
        }

        const nextToken = createRefreshToken();
        const result = await this.authRepository.rotateRefreshToken(
            hashRefreshToken(token),
            { jti: nextToken.jti, hash: nextToken.hash },
            client,
            new Date(),
        );

        if (result.status !== 'rotated') {
            throw new AppError(401, 'Invalid or expired refresh token.');
        }

        return {
            user: result.user,
            accessToken: createAccessToken(result.user.id, result.sessionId),
            refreshToken: nextToken.token,
        };
    }

    async logout(token: string | undefined): Promise<void> {
        if (token && token.length <= 128) {
            await this.authRepository.revokeSessionByRefreshHash(
                hashRefreshToken(token),
                new Date(),
            );
        }
    }

    async authenticateAccessToken(token: string) {
        let claims: z.infer<typeof accessTokenClaimsSchema>;

        try {
            const verified = jwt.verify(token, env.JWT_ACCESS_SECRET, {
                algorithms: ['HS256'],
                audience: env.JWT_AUDIENCE,
                issuer: env.JWT_ISSUER,
            });
            const parsedClaims = accessTokenClaimsSchema.safeParse(verified);

            if (!parsedClaims.success) {
                throw new Error('Invalid access token claims.');
            }

            claims = parsedClaims.data;
        } catch {
            throw new AppError(401, 'Invalid or expired access token.');
        }

        const session = await this.authRepository.findActiveSession(
            claims.sid,
            claims.sub,
            new Date(),
        );

        if (!session) {
            throw new AppError(401, 'Invalid or expired access token.');
        }

        return {
            userId: session.userId,
            sessionId: session.id,
        };
    }

    async getPublicUser(userId: string) {
        const user = await this.authRepository.findPublicUserById(userId);

        if (!user || user.status !== 'ACTIVE') {
            throw new AppError(401, 'User account is unavailable.');
        }

        return user;
    }
}
