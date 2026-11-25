import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service.js';
import { OrganizationRepository } from './organization.repository.js';
import { getRouteParam } from '../../common/utils/route-params.js';
import { successResponse } from '../../common/utils/api-response.js';
import { parsePagination } from '../../common/utils/pagination.js';

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
            const organizations = await organizationService.getAll(
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
            const organization = await organizationService.getById(
                getRouteParam(req, 'id'),
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
            const organization = await organizationService.create(req.body);

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
            const organization = await organizationService.update(
                getRouteParam(req, 'id'),
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
            await organizationService.delete(getRouteParam(req, 'id'));

            res.status(200).json(
                successResponse('Organization deleted successfully.', null),
            );
        } catch (error) {
            next(error);
        }
    }
}
