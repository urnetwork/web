/**
 * Comprehensive error types for API operations
 * Provides detailed error information for better error handling and user feedback
 */

/**
 * HTTP status code ranges
 */
export enum HttpStatusCode {
  // 2xx Success
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,

  // 4xx Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * Base error interface that all API errors extend
 */
export interface BaseApiError {
  readonly type: string;
  readonly message: string;
  readonly timestamp: string;
}

/**
 * HTTP error with status code information
 */
export interface HttpError extends BaseApiError {
  readonly type: 'HTTP_ERROR';
  readonly statusCode: number;
  readonly statusText: string;
  readonly responseBody?: string;
}

/**
 * Network-related errors (connection issues, timeouts, etc.)
 */
export interface NetworkError extends BaseApiError {
  readonly type: 'NETWORK_ERROR';
  readonly code: 'TIMEOUT' | 'CONNECTION_REFUSED' | 'DNS_FAILURE' | 'NETWORK_UNAVAILABLE';
}

/**
 * Request was aborted (user cancellation)
 */
export interface AbortError extends BaseApiError {
  readonly type: 'ABORT_ERROR';
  readonly reason?: string;
}

/**
 * JSON parsing failed
 */
export interface ParseError extends BaseApiError {
  readonly type: 'PARSE_ERROR';
  readonly rawResponse: string;
  readonly parseError: string;
}

/**
 * Response validation failed (doesn't match expected schema)
 */
export interface ValidationError extends BaseApiError {
  readonly type: 'VALIDATION_ERROR';
  readonly validationErrors: Array<{
    path: string;
    message: string;
  }>;
  readonly receivedData?: unknown;
}

/**
 * Authentication/Authorization errors
 */
export interface AuthError extends BaseApiError {
  readonly type: 'AUTH_ERROR';
  readonly authType: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'INSUFFICIENT_PERMISSIONS';
}

/**
 * Rate limiting error
 */
export interface RateLimitError extends BaseApiError {
  readonly type: 'RATE_LIMIT_ERROR';
  readonly retryAfter?: number; // seconds until retry is allowed
  readonly limit?: number;
  readonly remaining?: number;
}

/**
 * Generic unknown error fallback
 */
export interface UnknownError extends BaseApiError {
  readonly type: 'UNKNOWN_ERROR';
  readonly originalError?: unknown;
}

/**
 * Union type of all possible API errors
 */
export type ApiError =
  | HttpError
  | NetworkError
  | AbortError
  | ParseError
  | ValidationError
  | AuthError
  | RateLimitError
  | UnknownError;

/**
 * Result type for API operations - either success with data or failure with error
 * This enables explicit error handling and prevents accessing undefined data
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

/**
 * Helper function to create a successful result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Helper function to create a failed result
 */
export function failure<T>(error: ApiError): Result<T> {
  return { success: false, error };
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if result is a failure
 */
export function isFailure<T>(result: Result<T>): result is { success: false; error: ApiError } {
  return result.success === false;
}

/**
 * Error factory functions for creating specific error types
 */
export const createHttpError = (
  statusCode: number,
  statusText: string,
  message: string,
  responseBody?: string
): HttpError => ({
  type: 'HTTP_ERROR',
  statusCode,
  statusText,
  message,
  responseBody,
  timestamp: new Date().toISOString(),
});

export const createNetworkError = (
  code: NetworkError['code'],
  message: string
): NetworkError => ({
  type: 'NETWORK_ERROR',
  code,
  message,
  timestamp: new Date().toISOString(),
});

export const createAbortError = (reason?: string): AbortError => ({
  type: 'ABORT_ERROR',
  message: 'Request was aborted',
  reason,
  timestamp: new Date().toISOString(),
});

export const createParseError = (
  rawResponse: string,
  parseError: string
): ParseError => ({
  type: 'PARSE_ERROR',
  message: 'Failed to parse response as JSON',
  rawResponse,
  parseError,
  timestamp: new Date().toISOString(),
});

export const createValidationError = (
  validationErrors: ValidationError['validationErrors'],
  receivedData?: unknown
): ValidationError => ({
  type: 'VALIDATION_ERROR',
  message: 'Response validation failed',
  validationErrors,
  receivedData,
  timestamp: new Date().toISOString(),
});

export const createAuthError = (
  authType: AuthError['authType'],
  message?: string
): AuthError => ({
  type: 'AUTH_ERROR',
  authType,
  message: message || getAuthErrorMessage(authType),
  timestamp: new Date().toISOString(),
});

export const createRateLimitError = (
  retryAfter?: number,
  limit?: number,
  remaining?: number
): RateLimitError => ({
  type: 'RATE_LIMIT_ERROR',
  message: 'Rate limit exceeded',
  retryAfter,
  limit,
  remaining,
  timestamp: new Date().toISOString(),
});

export const createUnknownError = (
  message: string,
  originalError?: unknown
): UnknownError => ({
  type: 'UNKNOWN_ERROR',
  message,
  originalError,
  timestamp: new Date().toISOString(),
});

/**
 * Get user-friendly error message for auth error types
 */
function getAuthErrorMessage(authType: AuthError['authType']): string {
  switch (authType) {
    case 'MISSING_TOKEN':
      return 'Authentication token is missing';
    case 'INVALID_TOKEN':
      return 'Authentication token is invalid';
    case 'EXPIRED_TOKEN':
      return 'Authentication token has expired';
    case 'INSUFFICIENT_PERMISSIONS':
      return 'Insufficient permissions to perform this action';
  }
}

/**
 * Convert generic Error to ApiError
 */
export function errorToApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createAbortError(error.message);
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return createNetworkError('NETWORK_UNAVAILABLE', error.message);
    }

    if (error.message.includes('timeout')) {
      return createNetworkError('TIMEOUT', error.message);
    }

    return createUnknownError(error.message, error);
  }

  return createUnknownError('An unknown error occurred', error);
}

/**
 * Get user-friendly error message from ApiError
 */
export function getErrorMessage(error: ApiError): string {
  switch (error.type) {
    case 'HTTP_ERROR':
      if (error.statusCode === 401) {
        return 'Authentication failed. Please log in again.';
      }
      if (error.statusCode === 403) {
        return 'You do not have permission to perform this action.';
      }
      if (error.statusCode === 404) {
        return 'The requested resource was not found.';
      }
      if (error.statusCode >= 500) {
        return 'Server error. Please try again later.';
      }
      return error.message;

    case 'NETWORK_ERROR':
      if (error.code === 'TIMEOUT') {
        return 'Request timed out. Please check your connection and try again.';
      }
      return 'Network error. Please check your connection and try again.';

    case 'ABORT_ERROR':
      return 'Request was cancelled.';

    case 'PARSE_ERROR':
      return 'Failed to process server response. Please try again.';

    case 'VALIDATION_ERROR':
      return 'Received invalid data from server. Please try again.';

    case 'AUTH_ERROR':
      return error.message;

    case 'RATE_LIMIT_ERROR':
      if (error.retryAfter) {
        return `Rate limit exceeded. Please try again in ${error.retryAfter} seconds.`;
      }
      return 'Rate limit exceeded. Please try again later.';

    case 'UNKNOWN_ERROR':
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}
