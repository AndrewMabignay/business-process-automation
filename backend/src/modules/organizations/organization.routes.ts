import { Router } from 'express';
import { OrganizationController } from './organization.controller.js';

const router = Router();

// GET /api/organizations
router.get('/', OrganizationController.getAll);

// GET /api/organizations/:id
router.get('/:id', OrganizationController.getById);

// POST /api/organizations
router.post('/', OrganizationController.create);

// PATCH /api/organizations/:id
router.patch('/:id', OrganizationController.update);

// DELETE /api/organizations/:id
router.delete('/:id', OrganizationController.delete);

export default router;
