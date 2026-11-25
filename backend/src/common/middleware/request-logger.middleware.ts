import type { Request, Response, NextFunction } from 'express';

export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const startedAt = Date.now();

    res.on('finish', () => {
        console.info(
            JSON.stringify({
                level: 'info',
                message: 'HTTP request completed',
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                durationMs: Date.now() - startedAt,
            }),
        );
    });

    next();
}
