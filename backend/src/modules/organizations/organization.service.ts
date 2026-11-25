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

    async getAll(pagination: PaginationParams) {
        const [items, total] = await Promise.all([
            this.organizationRepository.findAll(pagination),
            this.organizationRepository.count(),
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

    async getById(id: string) {
        const organization = await this.organizationRepository.findById(id);

        if (!organization) {
            throw new AppError(404, 'Organization not found.');
        }

        return organization;
    }

    async create(data: CreateOrganizationDto) {
        const existingOrganization =
            await this.organizationRepository.findBySlug(data.slug);

        if (existingOrganization) {
            throw new AppError(409, 'Organization slug already exists.');
        }

        try {
            return await this.organizationRepository.create(data);
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2002')) {
                throw new AppError(409, 'Organization slug already exists.');
            }

            throw error;
        }
    }

    async update(id: string, data: UpdateOrganizationDto) {
        await this.getById(id);

        try {
            return await this.organizationRepository.update(id, data);
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2025')) {
                throw new AppError(404, 'Organization not found.');
            }

            throw error;
        }
    }

    async delete(id: string) {
        await this.getById(id);

        try {
            await this.organizationRepository.delete(id);
        } catch (error) {
            if (hasPrismaErrorCode(error, 'P2003')) {
                throw new AppError(
                    409,
                    'Cannot delete an organization with existing departments.',
                );
            }

            if (hasPrismaErrorCode(error, 'P2025')) {
                throw new AppError(404, 'Organization not found.');
            }

            throw error;
        }
    }
}
