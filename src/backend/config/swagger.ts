import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgriSmart API',
      version: '1.0.0',
      description: `
## Smart Agriculture Ecosystem — Backend API

This is the production-ready REST API for the AgriSmart platform.
It provides endpoints for:
- **Authentication** — Firebase JWT verification and user sync
- **Jobs (Worker Booking)** — Create, accept, complete, and cancel agricultural jobs
- **Marketplace** — Product listings, orders, and inventory management
- **Equipment Rentals** — Machinery booking with date-range availability
- **Notifications** — Real-time and persistent notification management
- **Admin** — Platform analytics, user management, and reporting

### Authentication
All protected endpoints require a Firebase ID Token in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <firebase_id_token>
\`\`\`
      `,
      contact: {
        name: 'AgriSmart Platform',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Development' },
      { url: process.env.APP_URL || 'https://agrismart-v1.onrender.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token obtained from Google Sign-In',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firebaseUid: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['FARMER', 'BUYER', 'WORKER', 'ADMIN'] },
            avatarUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            workName: { type: 'string' },
            workAddress: { type: 'string' },
            dateTime: { type: 'string', format: 'date-time' },
            workersNeeded: { type: 'integer' },
            payPerWorker: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['SEEDS', 'FERTILIZERS', 'PESTICIDES', 'TOOLS', 'MACHINERY', 'OTHER'] },
            price: { type: 'number' },
            stock: { type: 'integer' },
            imageUrl: { type: 'string' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] },
            items: { type: 'array', items: { type: 'object' } },
          },
        },
        Equipment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            dailyRate: { type: 'number' },
            inventoryCount: { type: 'integer' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            body: { type: 'string' },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: ['./src/backend/routes/*.ts', './src/**/*.ts'],
};

let spec: any;
try {
  spec = swaggerJsdoc(options);
} catch (e) {
  console.warn('[Swagger] Spec generation warning, using base definition:', e);
  spec = options.definition;
}

export const swaggerSpec = spec;
