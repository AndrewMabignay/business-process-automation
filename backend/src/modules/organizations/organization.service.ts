import { AppError } from '../../common/errors/app-error.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationRepository } from './organization.repository.js';
import {
    createPaginationMetadata,
    type PaginationParams,
} from '../../common/utils/pagination.js';

function hasPrismaErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === code
    );
}

export class OrganizationService {
    constructor(
        private readonly organizationRepository: OrganizationRepository,
    ) {}

    async getAll(userId: string, pagination: PaginationParams) {
        const [items, total] = await Promise.all([
            this.organizationRepository.findAllForUser(userId, pagination),
            this.organizationRepository.countForUser(userId),
        ]);

        return {
            items,
            pagination: createPaginationMetadata(
                pagination.page,
                pagination.limit,
                total,
            ),
        };
    }

    async getById(organizationId: string) {
        const organization =
            await this.organizationRepository.findById(organizationId);

        if (!organization) {
            throw new AppError(404, 'Organization not found.');
        }

        return organization;
    }

    async create(data: CreateOrganizationDto, userId: string) {
        try {
            return await this.organizationRepository.createForOwner(
                data,
                userId,
            );
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2002')) {
                throw new AppError(409, 'Organization slug already exists.');
            }

            throw error;
        }
    }

    async update(organizationId: string, data: UpdateOrganizationDto) {
        await this.getById(organizationId);

        try {
            return await this.organizationRepository.update(
                organizationId,
                data,
            );
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2025')) {
                throw new AppError(404, 'Organization not found.');
            }

            throw error;
        }
    }

    async delete(organizationId: string) {
        await this.getById(organizationId);

        try {
            await this.organizationRepository.delete(organizationId);
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2003')) {
                throw new AppError(
                    409,
                    'Cannot delete an organization with existing records.',
                );
            }

            if (hasPrismaErrorCode(error, 'P2025')) {
                throw new AppError(404, 'Organization not found.');
            }

            throw error;
        }
    }
}
