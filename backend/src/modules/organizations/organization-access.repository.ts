import { prisma } from '../../config/prisma.js';

export class OrganizationAccessRepository {
    async findActiveMembership(userId: string, organizationId: string) {
        return prisma.organizationMembership.findFirst({
            where: {
                userId,
                organizationId,
                status: 'ACTIVE',
                organization: {
                    status: 'ACTIVE',
                },
            },
            select: {
                id: true,
                organizationId: true,
            },
        });
    }

    async membershipHasPermission(
        membershipId: string,
        organizationId: string,
        permissionCode: string,
    ): Promise<boolean> {
        const assignment = await prisma.userRole.findFirst({
            where: {
                membershipId,
                organizationId,
                membership: {
                    status: 'ACTIVE',
                    organization: {
                        status: 'ACTIVE',
                    },
                },
                role: {
                    rolePermissions: {
                        some: {
                            permission: {
                                code: permissionCode,
                            },
                        },
                    },
                },
            },
            select: { membershipId: true },
        });

        return assignment !== null;
    }
}
