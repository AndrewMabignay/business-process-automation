import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { OrganizationAccessRepository } from '../../modules/organizations/organization-access.repository.js';
import { OrganizationAccessService } from '../../modules/organizations/organization-access.service.js';

const accessService = new OrganizationAccessService(
    new OrganizationAccessRepository(),
);

export function requireOrganizationContext(
    paramName = 'id',
    service: OrganizationAccessService = accessService,
) {
    return async function organizationContext(
        req: Request,
        _res: Response,
        next: NextFunction,
    ): Promise<void> {
        if (!req.auth) {
            next(new AppError(401, 'Authentication is required.'));
            return;
        }

        const organizationId = req.params[paramName];

        if (typeof organizationId !== 'string') {
            next(new AppError(400, 'Invalid organization ID.'));
            return;
        }

        try {
            req.organization = await service.requireActiveMembership(
                req.auth.userId,
                organizationId,
            );
            next();
        } catch (error) {
            next(error);
        }
    };
}
