import { prisma } from '../../config/prisma.js';

export interface NewUserRecord {
    email: string;
    passwordHash: string;
}

export interface NewAuthSessionRecord {
    userId: string;
    refreshTokenJti: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

export class AuthRepository {
    async createUser(data: NewUserRecord) {
        return prisma.user.create({
            data: {
                ...data,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                email: true,
                status: true,
                createdAt: true,
            },
        });
    }

    async findUserForLogin(email: string) {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                status: true,
                createdAt: true,
            },
        });
    }

    async findPublicUserById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                status: true,
                createdAt: true,
            },
        });
    }

    async createSession(data: NewAuthSessionRecord) {
        return prisma.$transaction(async (transaction) => {
            const session = await transaction.authSession.create({
                data: {
                    userId: data.userId,
                    expiresAt: data.expiresAt,
                    userAgent: data.userAgent,
                    ipAddress: data.ipAddress,
                },
            });

            await transaction.refreshToken.create({
                data: {
                    authSessionId: session.id,
                    jti: data.refreshTokenJti,
                    tokenHash: data.refreshTokenHash,
                    expiresAt: data.expiresAt,
                },
            });

            return session;
        });
    }

    async rotateRefreshToken(
        tokenHash: string,
        nextToken: { jti: string; hash: string },
        client: { userAgent?: string; ipAddress?: string },
        now: Date,
    ) {
        return prisma.$transaction(async (transaction) => {
            const storedToken = await transaction.refreshToken.findUnique({
                where: { tokenHash },
                include: {
                    authSession: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    status: true,
                                    createdAt: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!storedToken) {
                return { status: 'invalid' as const };
            }

            const session = storedToken.authSession;

            if (storedToken.expiresAt <= now || session.expiresAt <= now) {
                return { status: 'invalid' as const };
            }

            if (storedToken.consumedAt) {
                if (!session.revokedAt) {
                    await transaction.authSession.update({
                        where: { id: session.id },
                        data: { revokedAt: now },
                    });
                }

                return { status: 'reused' as const };
            }

            if (session.revokedAt || session.user.status !== 'ACTIVE') {
                return { status: 'invalid' as const };
            }

            const consumed = await transaction.refreshToken.updateMany({
                where: {
                    id: storedToken.id,
                    consumedAt: null,
                },
                data: { consumedAt: now },
            });

            if (consumed.count !== 1) {
                await transaction.authSession.updateMany({
                    where: {
                        id: session.id,
                        revokedAt: null,
                    },
                    data: { revokedAt: now },
                });

                return { status: 'reused' as const };
            }

            await transaction.refreshToken.create({
                data: {
                    authSessionId: session.id,
                    jti: nextToken.jti,
                    tokenHash: nextToken.hash,
                    expiresAt: session.expiresAt,
                },
            });

            await transaction.authSession.update({
                where: { id: session.id },
                data: {
                    lastUsedAt: now,
                    userAgent: client.userAgent,
                    ipAddress: client.ipAddress,
                },
            });

            return {
                status: 'rotated' as const,
                sessionId: session.id,
                user: session.user,
                sessionExpiresAt: session.expiresAt,
            };
        });
    }

    async findActiveSession(sessionId: string, userId: string, now: Date) {
        return prisma.authSession.findFirst({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
                expiresAt: { gt: now },
                user: { status: 'ACTIVE' },
            },
            select: {
                id: true,
                userId: true,
            },
        });
    }

    async revokeSessionByRefreshHash(tokenHash: string, now: Date) {
        await prisma.$transaction(async (transaction) => {
            const token = await transaction.refreshToken.findUnique({
                where: { tokenHash },
                select: { authSessionId: true },
            });

            if (token) {
                await transaction.authSession.updateMany({
                    where: {
                        id: token.authSessionId,
                        revokedAt: null,
                    },
                    data: { revokedAt: now },
                });
            }
        });
    }
}
