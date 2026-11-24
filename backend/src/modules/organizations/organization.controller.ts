import type { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service.js';
import { OrganizationRepository } from './organization.repository.js';
import { createOrganizationSchema } from './dto/create-organization.dto.js';
import { updateOrganizationSchema } from './dto/update-organization.dto.js';
import { AppError } from '../../common/errors/app-error.js';
import { getRouteParam } from '../../common/utils/route-params.js';

const organizationService = new OrganizationService(
    new OrganizationRepository(),
);

export class OrganizationController {
    static async getAll(_req: Request, res: Response, next: NextFunction) {
        try {
            const organizations = await organizationService.getAll();

            res.status(200).json({
                success: true,
                data: organizations,
            });
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const organization = await organizationService.getById(
                getRouteParam(req, 'id'),
            );

            res.status(200).json({
                success: true,
                data: organization,
            });
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = createOrganizationSchema.safeParse(req.body);

            if (!validation.success) {
                throw new AppError(
                    400,
                    validation.error.issues
                        .map((issue) => issue.message)
                        .join(', '),
                );
            }

            const organization = await organizationService.create(
                validation.data,
            );

            res.status(201).json({
                success: true,
                message: 'Organization created successfully.',
                data: organization,
            });
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const validation = updateOrganizationSchema.safeParse(req.body);

            if (!validation.success) {
                throw new AppError(
                    400,
                    validation.error.issues
                        .map((issue) => issue.message)
                        .join(', '),
                );
            }

            const organization = await organizationService.update(
                getRouteParam(req, 'id'),
                validation.data,
            );

            res.status(200).json({
                success: true,
                message: 'Organization updated successfully.',
                data: organization,
            });
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await organizationService.delete(getRouteParam(req, 'id'));

            res.status(200).json({
                success: true,
                message: 'Organization deleted successfully.',
            });
        } catch (error) {
            next(error);
        }
    }
}
