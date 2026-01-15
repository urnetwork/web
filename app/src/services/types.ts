/**
 * Type definitions for the application
 * All types include proper null/undefined handling and comprehensive field documentation
 */

/**
 * Configuration settings for the Wallet Stats display and behavior
 */
export interface WalletStatsSettings {
  /** Refresh interval in minutes */
  refreshInterval: number;
  /** Timezone for displaying timestamps */
  timezone: string;
  /** Whether automatic refresh is enabled */
  isAutoRefreshEnabled: boolean;
  /** Maximum number of data points to display in charts */
  maxDataPoints: number;
  /** Whether to show individual data points on charts */
  showDataPoints: boolean;
}

/**
 * Information about local storage usage for wallet stats
 */
export interface StorageInfo {
  /** Total number of records stored */
  totalRecords: number;
  /** Human-readable storage size (e.g., "10 MB") */
  storageSize: string;
}

/**
 * Response from authentication code login
 * Contains either a JWT token on success or an error message
 */
export interface AuthResponse {
  /** JWT token for authenticated requests (present on success) */
  by_jwt?: string;
  /** Error information (present on failure) */
  error?: {
    message: string;
  };
}

/**
 * Represents a network client device
 * Clients can have multiple connections and may be linked to a source client
 */
export interface Client {
  /** Unique identifier for this client */
  client_id: string;
  /** Optional reference to parent/source client */
  source_client_id?: string;
  /** Device identifier */
  device_id: string;
  /** Network identifier this client belongs to */
  network_id: string;
  /** Human-readable description of the client */
  description: string;
  /** Display name for the device */
  device_name: string;
  /** Technical specifications of the device */
  device_spec: string;
  /** ISO 8601 timestamp when client was created */
  create_time: string;
  /** ISO 8601 timestamp of last authentication */
  auth_time: string;
  /** Resident information for this client */
  resident: {
    client_id: string;
    instance_id: string;
    resident_id: string;
    resident_host: string;
    resident_service: string;
    resident_block: string;
    resident_internal_ports: number[];
  };
  /** Provider mode indicator */
  provide_mode: number;
  /** Array of active connections for this client */
  connections: Array<{
    client_id: string;
    connection_id: string;
    /** ISO 8601 timestamp when connection was established */
    connect_time: string;
    /** ISO 8601 timestamp when connection was terminated */
    disconnect_time: string;
    connection_host: string;
    connection_service: string;
    connection_block: null;
  }>;
}

/**
 * Response from fetching network clients
 * Always includes a clients array (may be empty) and optional error
 */
export interface ClientsResponse {
  /** Array of client objects (empty array if none found or on error) */
  clients: Client[];
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Response from removing a client
 * Contains error information if removal failed
 */
export interface RemoveClientResponse {
  /** Error information if request failed */
  error?: {
    message: string;
    /** Indicates if the request was aborted by user */
    isAborted?: boolean;
  };
}

/**
 * Represents a provider connectivity event
 */
export interface ProviderEvent {
  /** ISO 8601 timestamp of the event */
  event_time: string;
  /** Whether provider was connected at this time */
  connected: boolean;
}

/**
 * Provider statistics and current status
 * Contains performance metrics for the last 24 hours
 */
export interface Provider {
  /** Unique identifier for this provider */
  client_id: string;
  /** Current connection status */
  connected: boolean;
  /** Array of connection/disconnection events in last 24h */
  connected_events_last_24h: ProviderEvent[];
  /** Uptime percentage in last 24h (0-100) */
  uptime_last_24h: number;
  /** Data transferred in last 24h (in MB) */
  transfer_data_last_24h: number;
  /** Payout amount in last 24h (in USD) */
  payout_last_24h: number;
  /** Search interest count in last 24h */
  search_interest_last_24h: number;
  /** Contract count in last 24h */
  contracts_last_24h: number;
  /** Client count served in last 24h */
  clients_last_24h: number;
  /** Provider mode indicator */
  provide_mode: number;
}

/**
 * Response from fetching provider statistics
 */
export interface StatsResponse {
  /** ISO 8601 timestamp when these stats were generated */
  created_time: string;
  /** Array of provider statistics (empty on error) */
  providers: Provider[];
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Represents a single entry on the network leaderboard
 */
export interface LeaderboardEntry {
  /** Unique network identifier */
  network_id: string;
  /** Display name of the network */
  network_name: string;
  /** Total data transferred in MiB */
  net_mib_count: number;
  /** Whether this network is publicly visible */
  is_public: boolean;
}

/**
 * Response from fetching the leaderboard
 */
export interface LeaderboardResponse {
  /** Array of leaderboard entries sorted by rank (empty on error) */
  earners: LeaderboardEntry[];
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Response containing the current user's network ranking
 */
export interface NetworkRanking {
  /** Current network ranking information */
  network_ranking: {
    /** Total data transferred in MiB */
    net_mib_count: number;
    /** Position on the leaderboard (1-indexed) */
    leaderboard_rank: number;
    /** Whether ranking is publicly visible */
    leaderboard_public: boolean;
  };
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Specification for a provider location
 */
export interface LocationSpec {
  /** Unique location identifier */
  location_id: string;
  /** Group this location belongs to */
  location_group_id: string;
  /** Client providing service at this location */
  client_id: string;
  /** Whether this is the best available option */
  best_available: boolean;
}

/**
 * Group of related provider locations
 */
export interface LocationGroup {
  /** Unique identifier for this location group */
  location_group_id: string;
  /** Display name of the location group */
  name: string;
  /** Number of providers in this group */
  provider_count: number;
  /** Whether this group is promoted/featured */
  promoted: boolean;
  /** Match distance for search queries (0 = exact match) */
  match_distance: number;
}

/**
 * Detailed information about a provider location
 */
export interface Location {
  /** Unique location identifier */
  location_id: string;
  /** Type of location (e.g., 'city', 'region', 'country') */
  location_type: string;
  /** Display name of the location */
  name: string;
  /** City name */
  city: string;
  /** Identifier for the city */
  city_location_id: string;
  /** Region/state name */
  region: string;
  /** Identifier for the region */
  region_location_id: string;
  /** Country name */
  country: string;
  /** Identifier for the country */
  country_location_id: string;
  /** ISO country code (e.g., 'US', 'GB') */
  country_code: string;
  /** Number of providers at this location */
  provider_count: number;
  /** Match distance for search queries (0 = exact match) */
  match_distance: number;
}

/**
 * Represents a provider device
 */
export interface Device {
  /** Unique identifier for this device/client */
  client_id: string;
  /** Display name of the device */
  device_name: string;
}

/**
 * Response from fetching provider locations
 * Contains multiple arrays of location-related data
 */
export interface ProviderLocationsResponse {
  /** Array of location specifications (empty on error) */
  specs: LocationSpec[];
  /** Array of location groups (empty on error) */
  groups: LocationGroup[];
  /** Array of detailed locations (empty on error) */
  locations: Location[];
  /** Array of provider devices (empty on error) */
  devices: Device[];
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Wallet statistics for data transfer
 */
export interface WalletStats {
  /** Bytes provided that have been paid (in bytes) */
  paid_bytes_provided: number;
  /** Bytes provided awaiting payment (in bytes) */
  unpaid_bytes_provided: number;
}

/**
 * Response from fetching wallet statistics
 */
export interface WalletStatsResponse {
  /** Bytes provided that have been paid (in bytes) */
  paid_bytes_provided: number;
  /** Bytes provided awaiting payment (in bytes) */
  unpaid_bytes_provided: number;
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Historical wallet statistics entry
 */
export interface WalletStatsEntry {
  /** ISO 8601 timestamp of this entry */
  timestamp: string;
  /** Paid data in MB */
  paid_mb: number;
  /** Unpaid data in MB */
  unpaid_mb: number;
}

/**
 * Represents a payment transaction for provided services
 */
export type AccountPayment = {
  /** Unique identifier for this payment */
  payment_id: string;
  /** Type of cryptocurrency token used */
  token_type: string;
  /** Blockchain network the payment was made on */
  blockchain: string;
  /** Transaction hash for verification */
  tx_hash: string;
  /** ISO 8601 timestamp of payment */
  payment_time: string;
  /** Amount of tokens paid */
  token_amount: number;
  /** Number of bytes this payout covers */
  payout_byte_count: number;
  /** Whether payment has been completed */
  completed: boolean;
  /** Whether payment was canceled */
  canceled: boolean;
}

/**
 * Generic provider location type for dynamic data
 * Use specific Location interface where possible
 */
export type ProviderLocation = Record<string, unknown>

/**
 * Response from fetching account payment history
 */
export type AccountPaymentsResponse = {
  /** Array of payment transactions (empty on error) */
  account_payments: AccountPayment[];
  /** Error information if request failed */
  error?: { message: string };
}

/**
 * User information within the network
 */
export interface NetworkUser {
  /** Unique identifier for the user */
  user_id: string;
  /** User authentication identifier (email, username, etc.) */
  user_auth: string;
  /** Whether user's identity has been verified */
  verified: boolean;
  /** Type of authentication used */
  auth_type: string;
  /** Name of the network user belongs to */
  network_name: string;
}

/**
 * Response from password-based login
 * May require verification, provide network details on success, or contain error
 */
export interface PasswordLoginResponse {
  /** Present if additional verification is required */
  verification_required?: {
    user_auth: string;
  };
  /** Present on successful login */
  network?: {
    /** JWT token for authenticated requests */
    by_jwt: string;
    /** Name of the network */
    name: string;
  };
  /** Error information if login failed */
  error?: {
    message: string;
  };
}

/**
 * Response from fetching network user information
 */
export interface NetworkUserResponse {
  /** User information (present on success) */
  network_user?: NetworkUser;
  /** Error information if request failed */
  error?: { message?: string };
}

/**
 * Response from creating an authentication code
 */
export interface CreateAuthCodeResponse {
  /** Generated authentication code (present on success) */
  auth_code?: string;
  /** Duration in minutes the code is valid */
  duration_minutes?: number;
  /** Number of times the code can be used */
  uses?: number;
  /** Error information if creation failed */
  error?: {
    /** Whether the limit for active auth codes was exceeded */
    auth_code_limit_exceeded?: boolean;
    message: string;
  };
}

/**
 * Response from requesting a password reset
 */
export interface PasswordResetResponse {
  /** Error information if request failed */
  error?: {
    message: string;
  };
}

/**
 * Represents a points award for provided services
 */
export interface AccountPoint {
  /** Unique identifier for this point award */
  account_point_id: string;
  /** Network identifier */
  network_id: string;
  /** Event type that triggered the award (e.g., "payout", "referral") */
  event: string;
  /** Number of points awarded */
  point_value: number;
  /** Associated payment plan identifier */
  payment_plan_id: string;
  /** Associated payment identifier (links to AccountPayment) */
  account_payment_id: string;
  /** ISO 8601 timestamp when points were awarded */
  create_time: string;
}

/**
 * Response from fetching account points history
 */
export interface AccountPointsResponse {
  /** Array of point awards (empty on error) */
  account_points: AccountPoint[];
  /** Error information if request failed */
  error?: { message: string };
}

/**
 * Country multiplier for reliability calculations
 */
export interface CountryMultiplier {
  /** Location identifier for the country */
  country_location_id: string;
  /** Country name */
  country: string;
  /** ISO country code */
  country_code: string;
  /** Reliability multiplier for this country */
  reliability_multiplier: number;
}

/**
 * Reliability window data for network statistics
 */
export interface ReliabilityWindow {
  /** Mean reliability weight (0-1) */
  mean_reliability_weight: number;
  /** Minimum time in unix milliseconds */
  min_time_unix_milli: number;
  /** Minimum bucket number */
  min_bucket_number: number;
  /** Maximum time in unix milliseconds */
  max_time_unix_milli: number;
  /** Maximum bucket number */
  max_bucket_number: number;
  /** Duration of each bucket in seconds */
  bucket_duration_seconds: number;
  /** Maximum client count in any bucket */
  max_client_count: number;
  /** Maximum total client count */
  max_total_client_count: number;
  /** Array of reliability weights (0-1) for graphing */
  reliability_weights: number[];
  /** Array of client counts per bucket */
  client_counts: number[];
  /** Array of total client counts per bucket */
  total_client_counts: number[];
  /** Country-specific reliability multipliers */
  country_multipliers: CountryMultiplier[];
}

/**
 * Response from fetching network reliability data
 */
export interface NetworkReliabilityResponse {
  /** Reliability window data */
  reliability_window?: ReliabilityWindow;
  /** Error information if request failed */
  error?: { message: string };
}

/**
 * Network redeemed transfer balance code
 */
export interface RedeemedTransferBalanceCode {
  balance_code_id: string;
  balance_byte_count: number;
  redeem_time: string;
  end_time: string;
  secret: string;
}

/**
 * Response for fetching network redeemed transfer balance codes
 */
export interface RedeemedTransferBalanceCodesResponse {
  balance_codes: RedeemedTransferBalanceCode[];
  error?: { message: string };
}

/**
 * Response from redeeming a transfer balance code
 */
export interface RedeemTransferBalanceCodeResponse {
  error?: { message: string };
}