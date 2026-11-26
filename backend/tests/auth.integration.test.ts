import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';

function readRefreshCookie(response: Response) {
    const setCookie = response.headers.getSetCookie()[0];

    assert.ok(setCookie);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);

    const value = setCookie.match(/bpas_refresh_token=([^;]+)/)?.[1];
    assert.ok(value);

    return {
        value,
        header: `bpas_refresh_token=${value}`,
    };
}

function postJson(url: string, body: unknown) {
    return fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('auth sessions hash refresh tokens, rotate, detect reuse, and enforce tenant role scope', async () => {
    const suffix = randomUUID();
    const email = `auth-test-${suffix}@example.test`;
    const password = 'BPAS-integration-password-2026!';
    const server = app.listen(0, '127.0.0.1');
    let userId: string | undefined;
    let organizationAId: string | undefined;
    let organizationBId: string | undefined;

    try {
        await new Promise<void>((resolve) => server.once('listening', resolve));
        const address = server.address();

        assert.ok(address && typeof address !== 'string');
        const baseUrl = `http://127.0.0.1:${address.port}`;

        const rejectedRoleInput = await postJson(
            `${baseUrl}/api/auth/register`,
            { email, password, role: 'admin' },
        );
        assert.equal(rejectedRoleInput.status, 400);

        const registration = await postJson(`${baseUrl}/api/auth/register`, {
            email: email.toUpperCase(),
            password,
        });
        assert.equal(registration.status, 201);

        const registrationBody = await registration.json();
        userId = registrationBody.data.user.id;
        assert.equal(registrationBody.data.user.email, email);
        assert.equal('passwordHash' in registrationBody.data.user, false);
        assert.equal(
            await prisma.organizationMembership.count({ where: { userId } }),
            0,
        );

        const userRecord = await prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { passwordHash: true },
        });
        assert.ok(userRecord.passwordHash.startsWith('$argon2id$'));
        assert.notEqual(userRecord.passwordHash, password);

        const duplicate = await postJson(`${baseUrl}/api/auth/register`, {
            email,
            password,
        });
        assert.equal(duplicate.status, 409);

        const badLogin = await postJson(`${baseUrl}/api/auth/login`, {
            email,
            password: 'incorrect-password',
        });
        assert.equal(badLogin.status, 401);

        const login = await postJson(`${baseUrl}/api/auth/login`, {
            email,
            password,
        });
        assert.equal(login.status, 200);

        const loginCookie = readRefreshCookie(login);
        const loginBody = await login.json();
        assert.equal('refreshToken' in loginBody.data, false);

        const claims = jwt.decode(loginBody.data.accessToken);
        assert.ok(claims && typeof claims !== 'string');
        assert.equal(claims.iss, env.JWT_ISSUER);
        assert.equal(claims.aud, env.JWT_AUDIENCE);
        assert.ok(claims.exp > claims.iat);

        const refreshHash = createHash('sha256')
            .update(loginCookie.value)
            .digest('hex');
        const storedRefreshToken = await prisma.refreshToken.findUniqueOrThrow({
            where: { tokenHash: refreshHash },
        });
        assert.equal(storedRefreshToken.tokenHash.length, 64);
        assert.equal(storedRefreshToken.consumedAt, null);

        const authenticated = await fetch(`${baseUrl}/api/auth/me`, {
            headers: {
                authorization: `Bearer ${loginBody.data.accessToken}`,
            },
        });
        assert.equal(authenticated.status, 200);
        assert.equal(
            'passwordHash' in (await authenticated.json()).data.user,
            false,
        );

        const rotated = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { cookie: loginCookie.header },
        });
        assert.equal(rotated.status, 200);

        const rotatedCookie = readRefreshCookie(rotated);
        assert.notEqual(rotatedCookie.value, loginCookie.value);
        const rotatedBody = await rotated.json();
        const consumedRefreshToken =
            await prisma.refreshToken.findUniqueOrThrow({
                where: { tokenHash: refreshHash },
            });
        assert.ok(consumedRefreshToken.consumedAt);

        const replay = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { cookie: loginCookie.header },
        });
        assert.equal(replay.status, 401);

        const invalidatedAccess = await fetch(`${baseUrl}/api/auth/me`, {
            headers: {
                authorization: `Bearer ${rotatedBody.data.accessToken}`,
            },
        });
        assert.equal(invalidatedAccess.status, 401);

        const secondLogin = await postJson(`${baseUrl}/api/auth/login`, {
            email,
            password,
        });
        const secondCookie = readRefreshCookie(secondLogin);
        const secondLoginBody = await secondLogin.json();

        const rejectedOriginRefresh = await fetch(
            `${baseUrl}/api/auth/refresh`,
            {
                method: 'POST',
                headers: {
                    cookie: secondCookie.header,
                    origin: 'https://untrusted.example',
                },
            },
        );
        assert.equal(rejectedOriginRefresh.status, 403);

        const logout = await fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { cookie: secondCookie.header },
        });
        assert.equal(logout.status, 200);

        const loggedOut = await fetch(`${baseUrl}/api/auth/me`, {
            headers: {
                authorization: `Bearer ${secondLoginBody.data.accessToken}`,
            },
        });
        assert.equal(loggedOut.status, 401);

        [organizationAId, organizationBId] = await Promise.all([
            prisma.organization
                .create({
                    data: {
                        name: `Tenant A ${suffix}`,
                        slug: `tenant-a-${suffix}`,
                    },
                })
                .then((organization) => organization.id),
            prisma.organization
                .create({
                    data: {
                        name: `Tenant B ${suffix}`,
                        slug: `tenant-b-${suffix}`,
                    },
                })
                .then((organization) => organization.id),
        ]);

        const membership = await prisma.organizationMembership.create({
            data: {
                userId,
                organizationId: organizationAId,
                status: 'ACTIVE',
            },
        });
        const foreignRole = await prisma.role.create({
            data: {
                organizationId: organizationBId,
                key: `test-${suffix.slice(0, 8)}`,
                name: 'Foreign tenant test role',
            },
        });

        await assert.rejects(
            prisma.userRole.create({
                data: {
                    membershipId: membership.id,
                    organizationId: organizationAId,
                    roleId: foreignRole.id,
                },
            }),
            (error: unknown) =>
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2003',
        );
    } finally {
        if (server.listening) {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }

        if (userId) {
            await prisma.user.deleteMany({ where: { id: userId } });
        }

        if (organizationBId) {
            await prisma.role.deleteMany({
                where: { organizationId: organizationBId },
            });
        }

        const organizationIds = [organizationAId, organizationBId].filter(
            (id): id is string => Boolean(id),
        );

        if (organizationIds.length > 0) {
            await prisma.organization.deleteMany({
                where: { id: { in: organizationIds } },
            });
        }

        await prisma.$disconnect();
    }
});
