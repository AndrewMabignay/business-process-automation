import { Router } from 'express';
import { OrganizationController } from './organization.controller.js';
import { validateBody } from '../../common/middleware/validate.middleware.js';
import { createOrganizationSchema } from './dto/create-organization.dto.js';
import { updateOrganizationSchema } from './dto/update-organization.dto.js';

const router = Router();

// GET /api/organizations
router.get('/', OrganizationController.getAll);

// GET /api/organizations/:id
router.get('/:id', OrganizationController.getById);

// POST /api/organizations
router.post(
    '/',
    validateBody(createOrganizationSchema),
    OrganizationController.create,
);

// PATCH /api/organizations/:id
router.patch(
    '/:id',
    validateBody(updateOrganizationSchema),
    OrganizationController.update,
);

// DELETE /api/organizations/:id
router.delete('/:id', OrganizationController.delete);

export default router;
