declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                sessionId: string;
            };
            organization?: {
                id: string;
                membershipId: string;
            };
        }
    }
}

export {};
