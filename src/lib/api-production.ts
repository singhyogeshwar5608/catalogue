'use client';

// Local API configuration
export const API_BASE_URL_LOCAL = 'http://localhost:8000/api/v1';

// Production API configuration
export const API_BASE_URL_PRODUCTION = 'https://kaushalschoolfurniture.com/api/v1';

// Use environment variable or default to production
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 
  (process.env.NODE_ENV === 'development' ? API_BASE_URL_LOCAL : API_BASE_URL_PRODUCTION);

const AUTH_TOKEN_HEADER = 'Authorization';
export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

// Rest of the API functions remain the same...
// (Copy all functions from api.ts here)
