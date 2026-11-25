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
                summary: 'List organizations',
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
                        description: 'Paginated organizations.',
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
                },
            },
            post: {
                summary: 'Create an organization',
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
                },
            },
        },
        '/organizations/{id}': {
            parameters: [
                {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            get: {
                summary: 'Get an organization',
                responses: {
                    '200': { description: 'Organization details.' },
                    '404': { description: 'Organization not found.' },
                },
            },
            patch: {
                summary: 'Update an organization',
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
                    '404': { description: 'Organization not found.' },
                },
            },
            delete: {
                summary: 'Delete an organization',
                responses: {
                    '200': { description: 'Organization deleted.' },
                    '404': { description: 'Organization not found.' },
                    '409': {
                        description: 'Organization has related departments.',
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            Organization: organization,
            ErrorResponse: errorResponse,
        },
    },
} as const;
