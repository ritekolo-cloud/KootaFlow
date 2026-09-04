import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KootaFlow VSLA API',
      version: '1.0.0',
      description: 'API for the KootaFlow Village Savings and Loan Association (VSLA) Management System',
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api`,
        description: 'Development server',
      },
      {
        url: 'https://kootaflow-production-api.onrender.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.validator.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
