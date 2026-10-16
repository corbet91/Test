/** Base URL of the NestJS API; the browser calls it directly (the API allows this origin via CORS_ORIGIN). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
