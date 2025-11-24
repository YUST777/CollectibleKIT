import { NextResponse } from 'next/server';

/**
 * Standardized API Response Utility
 * Ensures consistent response format across all API routes
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  [key: string]: any; // Allow additional fields for backward compatibility
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a successful response
 */
export function successResponse<T = any>(
  data?: T,
  message?: string,
  status: number = 200,
  additionalFields?: Record<string, any>
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...additionalFields
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details })
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Common error responses with appropriate status codes
 */
export const ApiErrors = {
  unauthorized: () => errorResponse('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden: () => errorResponse('Forbidden', 403, 'FORBIDDEN'),
  notFound: (resource: string = 'Resource') => errorResponse(
    `${resource} not found`,
    404,
    'NOT_FOUND'
  ),
  badRequest: (message: string = 'Bad request') => errorResponse(
    message,
    400,
    'BAD_REQUEST'
  ),
  rateLimitExceeded: (message: string = 'Rate limit exceeded') => errorResponse(
    message,
    429,
    'RATE_LIMIT_EXCEEDED'
  ),
  internalServerError: (message: string = 'Internal server error', details?: any) => errorResponse(
    message,
    500,
    'INTERNAL_SERVER_ERROR',
    details
  ),
  validationError: (message: string, details?: any) => errorResponse(
    message,
    400,
    'VALIDATION_ERROR',
    details
  )
};

/**
 * Handle errors consistently
 */
export function handleApiError(error: unknown, defaultMessage: string = 'Internal server error'): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    // Check for known error types
    if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
      return ApiErrors.unauthorized();
    }
    
    if (error.message.includes('not found')) {
      return ApiErrors.notFound();
    }
    
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return ApiErrors.validationError(error.message);
    }
    
    return ApiErrors.internalServerError(error.message);
  }
  
  return ApiErrors.internalServerError(defaultMessage);
}

