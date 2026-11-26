const errorResponse = {
    type: 'object',
    required: ['success', 'message', 'data'],
    properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
        data: { nullable: true, example: null },
    },
};

const organization = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', maxLength: 150 },
        slug: { type: 'string', maxLength: 100 },
        email: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
};

export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'BPAS API',
        version: '1.0.0',
        description: 'Business Process Automation System backend API.',
    },
    servers: [{ url: '/api' }],
    paths: {
        '/auth/register': {
            post: {
                summary: 'Register a standalone user account',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: {
                                        type: 'string',
                                        minLength: 12,
                                        maxLength: 128,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Account registered.' },
                    '400': { description: 'Invalid registration data.' },
                    '409': { description: 'Email is already registered.' },
                },
            },
        },
        '/auth/login': {
            post: {
                summary: 'Authenticate and issue access/refresh tokens',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: {
                                        type: 'string',
                                        maxLength: 128,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description:
                            'Access token returned; refresh token set as an HttpOnly cookie.',
                    },
                    '401': { description: 'Invalid email or password.' },
                },
            },
        },
        '/auth/refresh': {
            post: {
                summary:
                    'Rotate the refresh token and issue a new access token',
                security: [{ refreshCookie: [] }],
                responses: {
                    '200': {
                        description:
                            'New access token returned and refresh cookie rotated.',
                    },
                    '401': {
                        description:
                            'Refresh token invalid, expired, or reused.',
                    },
                },
            },
        },
        '/auth/logout': {
            post: {
                summary: 'Revoke the current refresh-token session',
                security: [{ refreshCookie: [] }],
                responses: {
                    '200': { description: 'Session revoked.' },
                },
            },
        },
        '/auth/me': {
            get: {
                summary: 'Get the authenticated user',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Authenticated user.' },
                    '401': { description: 'Authentication required.' },
                },
            },
        },
        '/health': {
            get: {
                summary: 'Check API and database health',
                responses: {
                    '200': {
                        description: 'API and database are available.',
                    },
                    '503': {
                        description:
                            'API is running but database is unavailable.',
                    },
                },
            },
        },
        '/organizations': {
            get: {
                summary:
                    'List active organizations where the user has membership and read permission',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'page',
                        schema: { type: 'integer', minimum: 1, default: 1 },
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20,
                        },
                    },
                ],
                responses: {
                    '200': {
                        description:
                            'Paginated organizations visible to the authenticated user.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['success', 'message', 'data'],
                                    properties: {
                                        success: {
                                            type: 'boolean',
                                            example: true,
                                        },
                                        message: { type: 'string' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                items: {
                                                    type: 'array',
                                                    items: {
                                                        $ref: '#/components/schemas/Organization',
                                                    },
                                                },
                                                pagination: {
                                                    type: 'object',
                                                    properties: {
                                                        page: {
                                                            type: 'integer',
                                                        },
                                                        limit: {
                                                            type: 'integer',
                                                        },
                                                        total: {
                                                            type: 'integer',
                                                        },
                                                        totalPages: {
                                                            type: 'integer',
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Invalid pagination parameters.' },
                    '401': { description: 'Authentication required.' },
                },
            },
            post: {
                summary: 'Create an organization and become its initial owner',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'slug'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        minLength: 2,
                                        maxLength: 150,
                                    },
                                    slug: {
                                        type: 'string',
                                        minLength: 2,
                                        maxLength: 100,
                                    },
                                    email: { type: 'string', format: 'email' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Organization created.' },
                    '400': { description: 'Invalid request body.' },
                    '409': { description: 'Organization slug already exists.' },
                    '401': { description: 'Authentication required.' },
                },
            },
        },
        '/organizations/{id}': {
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            get: {
                summary:
                    'Get an organization with active membership and read permission',
                responses: {
                    '200': { description: 'Organization details.' },
                    '400': { description: 'Invalid organization ID.' },
                    '401': { description: 'Authentication required.' },
                    '403': {
                        description:
                            'Active membership or organization read permission is required.',
                    },
                },
            },
            patch: {
                summary:
                    'Update an organization with active membership and update permission',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                minProperties: 1,
                                properties: {
                                    name: {
                                        type: 'string',
                                        minLength: 2,
                                        maxLength: 150,
                                    },
                                    email: {
                                        type: 'string',
                                        format: 'email',
                                        nullable: true,
                                    },
                                    status: {
                                        type: 'string',
                                        enum: [
                                            'ACTIVE',
                                            'INACTIVE',
                                            'SUSPENDED',
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Organization updated.' },
                    '400': { description: 'Invalid request body.' },
                    '401': { description: 'Authentication required.' },
                    '403': {
                        description:
                            'Active membership or organization update permission is required.',
                    },
                },
            },
            delete: {
                summary:
                    'Delete an organization with active membership and delete permission',
                responses: {
                    '200': { description: 'Organization deleted.' },
                    '400': { description: 'Invalid organization ID.' },
                    '401': { description: 'Authentication required.' },
                    '403': {
                        description:
                            'Active membership or organization delete permission is required.',
                    },
                    '409': {
                        description:
                            'Organization has related records that prevent deletion.',
                    },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            refreshCookie: {
                type: 'apiKey',
                in: 'cookie',
                name: 'bpas_refresh_token',
            },
        },
        schemas: {
            Organization: organization,
            ErrorResponse: errorResponse,
        },
    },
} as const;
