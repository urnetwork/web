/**
 * Safe HTTP utilities for making API requests with comprehensive error handling
 */

import { z } from 'zod';
import {
  createHttpError,
  createParseError,
  createAbortError,
  errorToApiError,
  type Result,
  success,
  failure,
} from './errors';
import { validateData, isValidationSuccess } from './validation';

/**
 * Configuration for HTTP requests
 */
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Default timeout for requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Safely parse JSON response with error handling
 * Returns detailed error information if parsing fails
 */
export async function parseJsonResponse<T>(
  response: Response
): Promise<Result<T>> {
  const contentType = response.headers.get('content-type');

  // Check if response is JSON
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();

    // If response is empty and status is 204, return null as success
    if (response.status === 204 || text === '') {
      return success(null as T);
    }

    return failure(
      createParseError(
        text,
        `Expected JSON response but got content-type: ${contentType || 'none'}`
      )
    );
  }

  try {
    const text = await response.text();

    // Handle empty response
    if (!text || text.trim() === '') {
      return success(null as T);
    }

    const json = JSON.parse(text);
    return success(json as T);
  } catch (error) {
    const text = await response.text().catch(() => 'Unable to read response body');
    return failure(
      createParseError(
        text,
        error instanceof Error ? error.message : 'Unknown JSON parse error'
      )
    );
  }
}

/**
 * Make an HTTP request with comprehensive error handling and validation
 */
export async function safeFetch<T>(
  url: string,
  config: RequestConfig = {},
  schema?: z.ZodSchema<T>
): Promise<Result<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT,
    signal,
  } = config;

  // Create timeout signal if no signal provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const requestSignal = signal || controller.signal;

  try {
    // Prepare request options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: requestSignal,
    };

    // Add body if present
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(url, options);

    // Clear timeout
    clearTimeout(timeoutId);

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return failure(
        createHttpError(
          response.status,
          response.statusText,
          `HTTP ${response.status}: ${response.statusText}`,
          errorText
        )
      );
    }

    // Parse JSON response
    const parseResult = await parseJsonResponse<T>(response);

    if (!parseResult.success) {
      return parseResult;
    }

    // Validate against schema if provided
    if (schema) {
      const validationResult = validateData(schema, parseResult.data);

      if (!isValidationSuccess(validationResult)) {
        return failure(validationResult.error);
      }

      return success(validationResult.data);
    }

    return parseResult;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      return failure(createAbortError(error.message));
    }

    // Convert to ApiError
    return failure(errorToApiError(error));
  }
}

/**
 * Convenience method for GET requests
 */
export async function get<T>(
  url: string,
  headers?: Record<string, string>,
  schema?: z.ZodSchema<T>,
  signal?: AbortSignal
): Promise<Result<T>> {
  return safeFetch(url, { method: 'GET', headers, signal }, schema);
}

/**
 * Convenience method for POST requests
 */
export async function post<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  schema?: z.ZodSchema<T>,
  signal?: AbortSignal
): Promise<Result<T>> {
  return safeFetch(url, { method: 'POST', headers, body, signal }, schema);
}

/**
 * Convenience method for PUT requests
 */
export async function put<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
  schema?: z.ZodSchema<T>,
  signal?: AbortSignal
): Promise<Result<T>> {
  return safeFetch(url, { method: 'PUT', headers, body, signal }, schema);
}

/**
 * Convenience method for DELETE requests
 */
export async function del<T>(
  url: string,
  headers?: Record<string, string>,
  schema?: z.ZodSchema<T>,
  signal?: AbortSignal
): Promise<Result<T>> {
  return safeFetch(url, { method: 'DELETE', headers, signal }, schema);
}

/**
 * Retry logic for transient failures
 */
export async function fetchWithRetry<T>(
  url: string,
  config: RequestConfig = {},
  schema?: z.ZodSchema<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Result<T>> {
  let lastError: Result<T> | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await safeFetch(url, config, schema);

    if (result.success) {
      return result;
    }

    lastError = result;

    // Don't retry on certain error types
    if (
      result.error.type === 'ABORT_ERROR' ||
      result.error.type === 'AUTH_ERROR' ||
      result.error.type === 'VALIDATION_ERROR' ||
      (result.error.type === 'HTTP_ERROR' && result.error.statusCode < 500)
    ) {
      return result;
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      );
    }
  }

  return lastError!;
}

/**
 * Helper to check if response contains an error field
 * Many API responses have { data?, error? } structure
 */
export function hasApiError<T extends { error?: { message: string } }>(
  data: T
): data is T & { error: { message: string } } {
  return data.error !== undefined && typeof data.error.message === 'string';
}

/**
 * Helper to safely extract error message from API response
 */
export function extractErrorMessage<T extends { error?: { message?: string } }>(
  data: T
): string | null {
  return data.error?.message || null;
}
