import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './config/prisma.js';
import organizationRoutes from './modules/organizations/organization.routes.js';
import { errorMiddleware } from './common/middleware/error.middleware.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
    cors({
        origin: process.env.CLIENT_URL ?? 'http://localhost:4200',
        credentials: true,
    }),
);

// Request body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            message: 'BPAS API is running.',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch {
        res.status(503).json({
            success: false,
            message: 'BPAS API is running, but database is unavailable.',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
        });
    }
});

// Feature routes
app.use('/api/organizations', organizationRoutes);

// Error handler - always last
app.use(errorMiddleware);

export default app;
