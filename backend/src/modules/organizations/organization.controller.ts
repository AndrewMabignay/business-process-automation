import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service.js';
import { OrganizationRepository } from './organization.repository.js';
import { successResponse } from '../../common/utils/api-response.js';
import { parsePagination } from '../../common/utils/pagination.js';
import { AppError } from '../../common/errors/app-error.js';

const organizationService = new OrganizationService(
    new OrganizationRepository(),
);

export class OrganizationController {
    static async getAll(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (!req.auth) {
                throw new AppError(401, 'Authentication is required.');
            }

            const organizations = await organizationService.getAll(
                req.auth.userId,
                parsePagination(req.query),
            );

            res.status(200).json(
                successResponse(
                    'Organizations retrieved successfully.',
                    organizations,
                ),
            );
        } catch (error) {
            next(error);
        }
    }

    static async getById(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (!req.organization) {
                throw new AppError(500, 'Organization context is unavailable.');
            }

            const organization = await organizationService.getById(
                req.organization.id,
            );

            res.status(200).json(
                successResponse(
                    'Organization retrieved successfully.',
                    organization,
                ),
            );
        } catch (error) {
            next(error);
        }
    }

    static async create(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (!req.auth) {
                throw new AppError(401, 'Authentication is required.');
            }

            const organization = await organizationService.create(
                req.body,
                req.auth.userId,
            );

            res.status(201).json(
                successResponse(
                    'Organization created successfully.',
                    organization,
                ),
            );
        } catch (error) {
            next(error);
        }
    }

    static async update(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (!req.organization) {
                throw new AppError(500, 'Organization context is unavailable.');
            }

            const organization = await organizationService.update(
                req.organization.id,
                req.body,
            );

            res.status(200).json(
                successResponse(
                    'Organization updated successfully.',
                    organization,
                ),
            );
        } catch (error) {
            next(error);
        }
    }

    static async delete(
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            if (!req.organization) {
                throw new AppError(500, 'Organization context is unavailable.');
            }

            await organizationService.delete(req.organization.id);

            res.status(200).json(
                successResponse('Organization deleted successfully.', null),
            );
        } catch (error) {
            next(error);
        }
    }
}
