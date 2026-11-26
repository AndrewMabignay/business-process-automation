import { Router } from 'express';
import { OrganizationController } from './organization.controller.js';
import { validateBody } from '../../common/middleware/validate.middleware.js';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { requireOrganizationContext } from '../../common/middleware/organization-context.middleware.js';
import { requirePermission } from '../../common/middleware/require-permission.middleware.js';
import { createOrganizationSchema } from './dto/create-organization.dto.js';
import { updateOrganizationSchema } from './dto/update-organization.dto.js';

const router = Router();

router.use(authenticate);

// GET /api/organizations
router.get('/', OrganizationController.getAll);

// GET /api/organizations/:id
router.get(
    '/:id',
    requireOrganizationContext('id'),
    requirePermission('organizations.read'),
    OrganizationController.getById,
);

// POST /api/organizations
router.post(
    '/',
    validateBody(createOrganizationSchema),
    OrganizationController.create,
);

// PATCH /api/organizations/:id
router.patch(
    '/:id',
    requireOrganizationContext('id'),
    requirePermission('organizations.update'),
    validateBody(updateOrganizationSchema),
    OrganizationController.update,
);

// DELETE /api/organizations/:id
router.delete(
    '/:id',
    requireOrganizationContext('id'),
    requirePermission('organizations.delete'),
    OrganizationController.delete,
);

export default router;
