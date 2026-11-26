import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { prisma } from './config/prisma.js';
import { env } from './config/env.js';
import organizationRoutes from './modules/organizations/organization.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import { errorMiddleware } from './common/middleware/error.middleware.js';
import { requestLogger } from './common/middleware/request-logger.middleware.js';
import { successResponse, errorResponse } from './common/utils/api-response.js';
import { AppError } from './common/errors/app-error.js';
import { openApiSpec } from './docs/openapi.js';

const app = express();

app.use(requestLogger);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    }),
);

// Request body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json(
            successResponse('BPAS API is running.', {
                database: 'connected',
                timestamp: new Date().toISOString(),
            }),
        );
    } catch {
        res.status(503).json(
            errorResponse('BPAS API is running, but database is unavailable.', {
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            }),
        );
    }
});

app.get('/api/docs/openapi.json', (_req, res) => {
    res.status(200).json(openApiSpec);
});

// Feature routes
app.use('/api/organizations', organizationRoutes);
app.use('/api/auth', authRoutes);

// Standardized response for unknown routes
app.use((_req, _res, next) => {
    next(new AppError(404, 'Route not found.'));
});

// Error handler - always last
app.use(errorMiddleware);

export default app;
