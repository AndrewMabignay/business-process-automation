import { prisma } from '../../config/prisma.js';

export class OrganizationRepository {
    async findAll() {
        return prisma.organization.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findById(id: string) {
        return prisma.organization.findUnique({
            where: { id },
        });
    }

    async findBySlug(slug: string) {
        return prisma.organization.findUnique({
            where: { slug },
        });
    }

    async create(data: { name: string; slug: string; email?: string }) {
        return prisma.organization.create({
            data,
        });
    }

    async update(
        id: string,
        data: {
            name?: string;
            email?: string | null;
            status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
        },
    ) {
        return prisma.organization.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return prisma.organization.delete({
            where: { id },
        });
    }
}
