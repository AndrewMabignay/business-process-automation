import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { OrganizationAccessRepository } from '../../modules/organizations/organization-access.repository.js';
import { OrganizationAccessService } from '../../modules/organizations/organization-access.service.js';

const accessService = new OrganizationAccessService(
    new OrganizationAccessRepository(),
);

export function requirePermission(
    permissionCode: string,
    service: OrganizationAccessService = accessService,
) {
    return async function permissionCheck(
        req: Request,
        _res: Response,
        next: NextFunction,
    ): Promise<void> {
        if (!req.auth) {
            next(new AppError(401, 'Authentication is required.'));
            return;
        }

        if (!req.organization) {
            next(new AppError(500, 'Organization context is unavailable.'));
            return;
        }

        try {
            const allowed = await service.hasPermission(
                req.organization.membershipId,
                req.organization.id,
                permissionCode,
            );

            if (!allowed) {
                next(new AppError(403, 'Permission is denied.'));
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}
