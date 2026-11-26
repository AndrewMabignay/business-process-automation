import { z } from 'zod';
import { AppError } from '../../common/errors/app-error.js';
import { OrganizationAccessRepository } from './organization-access.repository.js';

const organizationIdSchema = z.uuid();

export class OrganizationAccessService {
    constructor(
        private readonly accessRepository: OrganizationAccessRepository,
    ) {}

    async requireActiveMembership(userId: string, organizationId: string) {
        if (!organizationIdSchema.safeParse(organizationId).success) {
            throw new AppError(400, 'Invalid organization ID.');
        }

        const membership = await this.accessRepository.findActiveMembership(
            userId,
            organizationId,
        );

        if (!membership) {
            throw new AppError(403, 'Organization access is denied.');
        }

        return {
            id: membership.organizationId,
            membershipId: membership.id,
        };
    }

    async hasPermission(
        membershipId: string,
        organizationId: string,
        permissionCode: string,
    ): Promise<boolean> {
        return this.accessRepository.membershipHasPermission(
            membershipId,
            organizationId,
            permissionCode,
        );
    }
}
