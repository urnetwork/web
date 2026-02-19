/**
 * Runtime validation utilities using Zod
 * Provides schemas and validation functions for all API responses
 */

import { z } from 'zod';
import { createValidationError } from './errors';
import type { ValidationError } from './errors';

/**
 * Base schemas for common types
 */

// ISO 8601 datetime string
const dateTimeSchema = z.string().datetime();

// Positive integer
const positiveIntSchema = z.number().int().nonnegative();

// Non-empty string
const nonEmptyStringSchema = z.string().min(1);

/**
 * Connection schema
 */
const connectionSchema = z.object({
  client_id: nonEmptyStringSchema,
  connection_id: nonEmptyStringSchema,
  connect_time: dateTimeSchema,
  disconnect_time: dateTimeSchema,
  connection_host: nonEmptyStringSchema,
  connection_service: nonEmptyStringSchema,
  connection_block: z.null(),
});

/**
 * Resident schema
 */
const residentSchema = z.object({
  client_id: nonEmptyStringSchema,
  instance_id: nonEmptyStringSchema,
  resident_id: nonEmptyStringSchema,
  resident_host: nonEmptyStringSchema,
  resident_service: nonEmptyStringSchema,
  resident_block: nonEmptyStringSchema,
  resident_internal_ports: z.array(positiveIntSchema),
});

/**
 * Client schema - comprehensive validation for client objects
 */
export const clientSchema = z.object({
  client_id: nonEmptyStringSchema,
  source_client_id: nonEmptyStringSchema.optional(),
  device_id: nonEmptyStringSchema,
  network_id: nonEmptyStringSchema,
  description: z.string(),
  device_name: z.string(),
  device_spec: z.string(),
  create_time: dateTimeSchema,
  auth_time: dateTimeSchema,
  resident: residentSchema,
  provide_mode: z.number().int(),
  connections: z.array(connectionSchema),
});

export type ValidatedClient = z.infer<typeof clientSchema>;

/**
 * Provider Event schema
 */
const providerEventSchema = z.object({
  event_time: dateTimeSchema,
  connected: z.boolean(),
});

/**
 * Provider schema
 */
export const providerSchema = z.object({
  client_id: nonEmptyStringSchema,
  connected: z.boolean(),
  connected_events_last_24h: z.array(providerEventSchema),
  uptime_last_24h: z.number().nonnegative(),
  transfer_data_last_24h: z.number().nonnegative(),
  payout_last_24h: z.number().nonnegative(),
  search_interest_last_24h: z.number().int().nonnegative(),
  contracts_last_24h: z.number().int().nonnegative(),
  clients_last_24h: z.number().int().nonnegative(),
  provide_mode: z.number().int(),
});

export type ValidatedProvider = z.infer<typeof providerSchema>;

/**
 * Location schema
 */
export const locationSchema = z.object({
  location_id: nonEmptyStringSchema,
  location_type: z.string(),
  name: z.string(),
  city: z.string(),
  city_location_id: z.string(),
  region: z.string(),
  region_location_id: z.string(),
  country: z.string(),
  country_location_id: z.string(),
  country_code: z.string(),
  provider_count: positiveIntSchema,
  match_distance: z.number().nonnegative(),
});

export type ValidatedLocation = z.infer<typeof locationSchema>;

/**
 * Location Group schema
 */
export const locationGroupSchema = z.object({
  location_group_id: nonEmptyStringSchema,
  name: z.string(),
  provider_count: positiveIntSchema,
  promoted: z.boolean(),
  match_distance: z.number().nonnegative(),
});

export type ValidatedLocationGroup = z.infer<typeof locationGroupSchema>;

/**
 * Location Spec schema
 */
export const locationSpecSchema = z.object({
  location_id: nonEmptyStringSchema,
  location_group_id: nonEmptyStringSchema,
  client_id: nonEmptyStringSchema,
  best_available: z.boolean(),
});

export type ValidatedLocationSpec = z.infer<typeof locationSpecSchema>;

/**
 * Device schema
 */
export const deviceSchema = z.object({
  client_id: nonEmptyStringSchema,
  device_name: z.string(),
});

export type ValidatedDevice = z.infer<typeof deviceSchema>;

/**
 * Network User schema
 */
export const networkUserSchema = z.object({
  user_id: nonEmptyStringSchema,
  user_auth: nonEmptyStringSchema,
  verified: z.boolean(),
  auth_type: z.string(),
  network_name: z.string(),
});

export type ValidatedNetworkUser = z.infer<typeof networkUserSchema>;

/**
 * Leaderboard Entry schema
 */
export const leaderboardEntrySchema = z.object({
  network_id: nonEmptyStringSchema,
  network_name: z.string(),
  net_mib_count: z.number().nonnegative(),
  is_public: z.boolean(),
});

export type ValidatedLeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

/**
 * Network Ranking schema
 */
export const networkRankingSchema = z.object({
  net_mib_count: z.number().nonnegative(),
  leaderboard_rank: z.number().int().positive(),
  leaderboard_public: z.boolean(),
});

export type ValidatedNetworkRanking = z.infer<typeof networkRankingSchema>;

/**
 * Account Payment schema
 */
export const accountPaymentSchema = z.object({
  payment_id: nonEmptyStringSchema,
  token_type: z.string(),
  blockchain: z.string(),
  tx_hash: z.string(),
  payment_time: dateTimeSchema,
  token_amount: z.number().nonnegative(),
  payout_byte_count: z.number().nonnegative(),
  completed: z.boolean(),
  canceled: z.boolean(),
});

export type ValidatedAccountPayment = z.infer<typeof accountPaymentSchema>;

/**
 * API Response schemas - wrapping data with optional error
 */

export const authResponseSchema = z.object({
  by_jwt: nonEmptyStringSchema.optional(),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const passwordLoginResponseSchema = z.object({
  verification_required: z.object({
    user_auth: nonEmptyStringSchema,
  }).optional(),
  network: z.object({
    by_jwt: nonEmptyStringSchema,
    name: z.string(),
  }).optional(),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const clientsResponseSchema = z.object({
  clients: z.array(clientSchema).default([]),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const statsResponseSchema = z.object({
  created_time: dateTimeSchema,
  providers: z.array(providerSchema).default([]),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const leaderboardResponseSchema = z.object({
  earners: z.array(leaderboardEntrySchema).default([]),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const networkRankingResponseSchema = z.object({
  network_ranking: networkRankingSchema,
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const providerLocationsResponseSchema = z.object({
  specs: z.array(locationSpecSchema).default([]),
  groups: z.array(locationGroupSchema).default([]),
  locations: z.array(locationSchema).default([]),
  devices: z.array(deviceSchema).default([]),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const walletStatsResponseSchema = z.object({
  paid_bytes_provided: z.number().nonnegative(),
  unpaid_bytes_provided: z.number().nonnegative(),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const networkUserResponseSchema = z.object({
  network_user: networkUserSchema.optional(),
  error: z.object({
    message: z.string().optional(),
  }).optional(),
});

export const createAuthCodeResponseSchema = z.object({
  auth_code: nonEmptyStringSchema.optional(),
  duration_minutes: positiveIntSchema.optional(),
  uses: positiveIntSchema.optional(),
  error: z.object({
    auth_code_limit_exceeded: z.boolean().optional(),
    message: z.string(),
  }).optional(),
});

export const accountPaymentsResponseSchema = z.object({
  account_payments: z.array(accountPaymentSchema).default([]),
  error: z.object({
    message: z.string(),
  }).optional(),
});

export const removeClientResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    isAborted: z.boolean().optional(),
  }).optional(),
});

/**
 * Generic validation function
 * Validates data against a Zod schema and returns ValidationError if invalid
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { valid: true; data: T } | { valid: false; error: ValidationError } {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        valid: false,
        error: createValidationError(validationErrors, data),
      };
    }
    return {
      valid: false,
      error: createValidationError(
        [{ path: 'unknown', message: 'Unknown validation error' }],
        data
      ),
    };
  }
}

/**
 * Type guard to check if validation was successful
 */
export function isValidationSuccess<T>(
  result: { valid: true; data: T } | { valid: false; error: ValidationError }
): result is { valid: true; data: T } {
  return result.valid === true;
}

/**
 * Safe validation that returns null on error (for optional validation)
 */
export function validateDataSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  const result = validateData(schema, data);
  return result.valid ? result.data : null;
}

/**
 * Partial validation - validates only the fields present in the data
 * Useful for incremental data loading
 */
export function validatePartial<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { valid: true; data: Partial<T> } | { valid: false; error: ValidationError } {
  try {
    const partialSchema = schema.partial();
    const validated = partialSchema.parse(data);
    return { valid: true, data: validated as Partial<T> };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        valid: false,
        error: createValidationError(validationErrors, data),
      };
    }
    return {
      valid: false,
      error: createValidationError(
        [{ path: 'unknown', message: 'Unknown validation error' }],
        data
      ),
    };
  }
}
