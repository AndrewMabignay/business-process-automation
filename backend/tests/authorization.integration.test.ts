import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';

function postJson(url: string, body: unknown, token?: string) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
}

async function createAuthenticatedUser(baseUrl: string, suffix: string) {
    const email = `authorization-${suffix}@example.test`;
    const password = 'BPAS-authorization-integration-password!';
    const registration = await postJson(`${baseUrl}/api/auth/register`, {
        email,
        password,
    });
    assert.equal(registration.status, 201);

    const login = await postJson(`${baseUrl}/api/auth/login`, {
        email,
        password,
    });
    assert.equal(login.status, 200);

    const body = await login.json();
    return {
        userId: body.data.user.id as string,
        accessToken: body.data.accessToken as string,
    };
}

test('organization routes enforce authentication, active membership, and tenant permissions', async () => {
    const suffix = randomUUID();
    const server = app.listen(0, '127.0.0.1');
    const userIds: string[] = [];
    const organizationIds: string[] = [];

    try {
        await new Promise<void>((resolve) => server.once('listening', resolve));
        const address = server.address();

        assert.ok(address && typeof address !== 'string');
        const baseUrl = `http://127.0.0.1:${address.port}`;

        const unauthenticated = await fetch(`${baseUrl}/api/organizations`);
        assert.equal(unauthenticated.status, 401);

        const invalidToken = await fetch(`${baseUrl}/api/organizations`, {
            headers: { authorization: 'Bearer not-a-jwt' },
        });
        assert.equal(invalidToken.status, 401);

        const expiredToken = jwt.sign(
            { sid: randomUUID() },
            env.JWT_ACCESS_SECRET,
            {
                algorithm: 'HS256',
                audience: env.JWT_AUDIENCE,
                expiresIn: -1,
                issuer: env.JWT_ISSUER,
                subject: randomUUID(),
            },
        );
        const expired = await fetch(`${baseUrl}/api/organizations`, {
            headers: { authorization: `Bearer ${expiredToken}` },
        });
        assert.equal(expired.status, 401);

        const creator = await createAuthenticatedUser(baseUrl, `${suffix}-a`);
        userIds.push(creator.userId);
        const secondUser = await createAuthenticatedUser(
            baseUrl,
            `${suffix}-b`,
        );
        userIds.push(secondUser.userId);

        const unauthenticatedCreate = await postJson(
            `${baseUrl}/api/organizations`,
            { name: `Unauthorized ${suffix}`, slug: `unauthorized-${suffix}` },
        );
        assert.equal(unauthenticatedCreate.status, 401);

        const createFirstOrganization = await postJson(
            `${baseUrl}/api/organizations`,
            {
                name: `Authorization Tenant A ${suffix}`,
                slug: `authorization-a-${suffix}`,
            },
            creator.accessToken,
        );
        assert.equal(createFirstOrganization.status, 201);
        const firstBody = await createFirstOrganization.json();
        const firstOrganizationId = firstBody.data.id as string;
        organizationIds.push(firstOrganizationId);

        const createSecondOrganization = await postJson(
            `${baseUrl}/api/organizations`,
            {
                name: `Authorization Tenant B ${suffix}`,
                slug: `authorization-b-${suffix}`,
            },
            secondUser.accessToken,
        );
        assert.equal(createSecondOrganization.status, 201);
        const secondBody = await createSecondOrganization.json();
        const secondOrganizationId = secondBody.data.id as string;
        organizationIds.push(secondOrganizationId);

        const allowed = await fetch(
            `${baseUrl}/api/organizations/${firstOrganizationId}`,
            {
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(allowed.status, 200);

        const malformedId = await fetch(
            `${baseUrl}/api/organizations/not-a-uuid`,
            {
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(malformedId.status, 400);

        const unauthorizedTenant = await fetch(
            `${baseUrl}/api/organizations/${secondOrganizationId}`,
            {
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(unauthorizedTenant.status, 403);

        const membership =
            await prisma.organizationMembership.findUniqueOrThrow({
                where: {
                    userId_organizationId: {
                        userId: creator.userId,
                        organizationId: firstOrganizationId,
                    },
                },
            });

        await prisma.organizationMembership.update({
            where: { id: membership.id },
            data: { status: 'SUSPENDED' },
        });
        const inactiveMembership = await fetch(
            `${baseUrl}/api/organizations/${firstOrganizationId}`,
            {
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(inactiveMembership.status, 403);
        await prisma.organizationMembership.update({
            where: { id: membership.id },
            data: { status: 'ACTIVE' },
        });

        const ownerRole = await prisma.role.findFirstOrThrow({
            where: {
                organizationId: firstOrganizationId,
                key: 'OWNER',
            },
        });
        const readPermission = await prisma.permission.findUniqueOrThrow({
            where: { code: 'organizations.read' },
        });
        await prisma.rolePermission.delete({
            where: {
                roleId_permissionId: {
                    roleId: ownerRole.id,
                    permissionId: readPermission.id,
                },
            },
        });

        const missingPermission = await fetch(
            `${baseUrl}/api/organizations/${firstOrganizationId}`,
            {
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(missingPermission.status, 403);
        await prisma.rolePermission.create({
            data: {
                roleId: ownerRole.id,
                permissionId: readPermission.id,
            },
        });

        const visibleOrganizations = await fetch(
            `${baseUrl}/api/organizations`,
            {
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(visibleOrganizations.status, 200);
        const visibleBody = await visibleOrganizations.json();
        assert.equal(visibleBody.data.items.length, 1);
        assert.equal(visibleBody.data.items[0].id, firstOrganizationId);
        assert.equal(visibleBody.data.pagination.total, 1);

        const update = await fetch(
            `${baseUrl}/api/organizations/${firstOrganizationId}`,
            {
                method: 'PATCH',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${creator.accessToken}`,
                },
                body: JSON.stringify({ name: `Updated tenant ${suffix}` }),
            },
        );
        assert.equal(update.status, 200);

        const deletion = await fetch(
            `${baseUrl}/api/organizations/${firstOrganizationId}`,
            {
                method: 'DELETE',
                headers: {
                    authorization: `Bearer ${creator.accessToken}`,
                },
            },
        );
        assert.equal(deletion.status, 200);
    } finally {
        if (server.listening) {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }

        if (userIds.length > 0) {
            await prisma.user.deleteMany({
                where: { id: { in: userIds } },
            });
        }

        if (organizationIds.length > 0) {
            await prisma.role.deleteMany({
                where: { organizationId: { in: organizationIds } },
            });
            await prisma.organization.deleteMany({
                where: { id: { in: organizationIds } },
            });
        }

        await prisma.$disconnect();
    }
});
