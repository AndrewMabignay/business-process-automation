import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.middleware.js';
import { validateBody } from '../../common/middleware/validate.middleware.js';
import { verifyOrigin } from '../../common/middleware/verify-origin.middleware.js';
import { AuthController } from './auth.controller.js';
import { loginSchema } from './dto/login.dto.js';
import { registerSchema } from './dto/register.dto.js';

const router = Router();

router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/refresh', verifyOrigin, AuthController.refresh);
router.post('/logout', verifyOrigin, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
