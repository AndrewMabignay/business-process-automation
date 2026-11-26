import { prisma } from '../../config/prisma.js';
import type { PaginationParams } from '../../common/utils/pagination.js';
import type { Prisma } from '../../../generated/prisma/client.js';

export const organizationPermissions = [
    { code: 'organizations.read', name: 'Read organizations' },
    { code: 'organizations.update', name: 'Update organizations' },
    { code: 'organizations.delete', name: 'Delete organizations' },
] as const;

function getVisibleOrganizationWhere(
    userId: string,
): Prisma.OrganizationWhereInput {
    return {
        status: 'ACTIVE',
        memberships: {
            some: {
                userId,
                status: 'ACTIVE',
                userRoles: {
                    some: {
                        role: {
                            rolePermissions: {
                                some: {
                                    permission: {
                                        code: 'organizations.read',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}

export class OrganizationRepository {
    async findAllForUser(userId: string, { skip, limit }: PaginationParams) {
        return prisma.organization.findMany({
            where: getVisibleOrganizationWhere(userId),
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async countForUser(userId: string) {
        return prisma.organization.count({
            where: getVisibleOrganizationWhere(userId),
        });
    }

    async findById(organizationId: string) {
        return prisma.organization.findUnique({
            where: { id: organizationId },
        });
    }

    async createForOwner(
        data: { name: string; slug: string; email?: string },
        userId: string,
    ) {
        return prisma.$transaction(async (transaction) => {
            const organization = await transaction.organization.create({
                data,
            });
            const membership = await transaction.organizationMembership.create({
                data: {
                    userId,
                    organizationId: organization.id,
                    status: 'ACTIVE',
                },
            });
            const permissions = await Promise.all(
                organizationPermissions.map((permission) =>
                    transaction.permission.upsert({
                        where: { code: permission.code },
                        update: { name: permission.name },
                        create: permission,
                    }),
                ),
            );
            const role = await transaction.role.create({
                data: {
                    organizationId: organization.id,
                    key: 'OWNER',
                    name: 'Organization owner',
                    isSystem: true,
                },
            });

            await transaction.rolePermission.createMany({
                data: permissions.map((permission) => ({
                    roleId: role.id,
                    permissionId: permission.id,
                })),
            });
            await transaction.userRole.create({
                data: {
                    membershipId: membership.id,
                    organizationId: organization.id,
                    roleId: role.id,
                },
            });

            return organization;
        });
    }

    async update(
        organizationId: string,
        data: {
            name?: string;
            email?: string | null;
            status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
        },
    ) {
        return prisma.organization.update({
            where: { id: organizationId },
            data,
        });
    }

    async delete(organizationId: string) {
        return prisma.$transaction(async (transaction) => {
            await transaction.userRole.deleteMany({
                where: { organizationId },
            });
            await transaction.organizationMembership.deleteMany({
                where: { organizationId },
            });
            await transaction.role.deleteMany({
                where: { organizationId },
            });

            return transaction.organization.delete({
                where: { id: organizationId },
            });
        });
    }
}
