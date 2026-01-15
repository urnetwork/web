/**
 * API service layer with comprehensive error handling and type validation
 * All functions return the original response types for backward compatibility
 * Enhanced with safe JSON parsing and proper error handling
 */

import type {
  AuthResponse,
  Client,
  ClientsResponse,
  RemoveClientResponse,
  Provider,
  StatsResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  NetworkRanking,
  WalletStatsResponse,
  NetworkUserResponse,
  ProviderLocationsResponse,
  PasswordLoginResponse,
  CreateAuthCodeResponse,
  PasswordResetResponse,
  LocationSpec,
  LocationGroup,
  Device,
  NetworkUser,
  WalletStats,
  WalletStatsEntry,
  ProviderLocation,
  AccountPayment,
  AccountPaymentsResponse,
  AccountPoint,
  AccountPointsResponse,
  NetworkReliabilityResponse,
  RedeemedTransferBalanceCodesResponse,
  RedeemTransferBalanceCodeResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE ?? "https://api.bringyour.com";

/**
 * Safely parse JSON response with fallback to text on error
 * Prevents application crashes from malformed JSON
 */
async function safeJsonParse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  // Only attempt JSON parsing if content-type is JSON
  if (contentType && contentType.includes('application/json')) {
    try {
      const text = await response.text();
      if (!text || text.trim() === '') {
        return {} as T;
      }
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('JSON parse error:', error);
      throw new Error('Failed to parse response as JSON');
    }
  }

  // Non-JSON response
  const text = await response.text();
  throw new Error(`Expected JSON response but got: ${text.substring(0, 100)}`);
}

/**
 * Authentication API - Login with authentication code
 * @param authCode - The authentication code to log in with
 * @returns AuthResponse containing JWT token or error
 */
export const login = async (authCode: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/code-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_code: authCode,
      }),
    });

    if (!response.ok) {
      console.error("Login failed:", response.status, response.statusText);
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<AuthResponse>(response);
  } catch (error) {
    console.error("Login error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Authentication failed",
      },
    };
  }
};

/**
 * Email/Password login API
 * @param userAuth - User email or username
 * @param password - User password
 * @returns PasswordLoginResponse with network info or error
 */
export const loginWithPassword = async (
  userAuth: string,
  password: string
): Promise<PasswordLoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login-with-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_auth: userAuth,
        password: password,
      }),
    });

    if (!response.ok) {
      console.error(
        "Password login failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<PasswordLoginResponse>(response);
  } catch (error) {
    console.error("Password login error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Password authentication failed",
      },
    };
  }
};

/**
 * Get network user information
 * @param token - JWT authentication token
 * @returns NetworkUserResponse with user info or error
 */
export const fetchNetworkUser = async (
  token: string
): Promise<NetworkUserResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/network/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Fetch network user failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<NetworkUserResponse>(response);
  } catch (error) {
    console.error("Fetch network user error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch network user",
      },
    };
  }
};

/**
 * Get all clients for the authenticated user
 * @param token - JWT authentication token
 * @returns ClientsResponse with array of clients or error
 */
export const fetchClients = async (token: string): Promise<ClientsResponse> => {
  try {
    console.log(
      "Fetching clients with token:",
      token ? "Token present" : "No token"
    );
    const response = await fetch(`${API_BASE_URL}/network/clients`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Fetch clients failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        clients: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<ClientsResponse>(response);

    // Ensure clients is always an array
    return {
      clients: Array.isArray(data.clients) ? data.clients : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch clients error:", error);
    return {
      clients: [],
      error: {
        message:
          error instanceof Error ? error.message : "Failed to fetch clients",
      },
    };
  }
};

/**
 * Remove a client from the network
 * @param token - JWT authentication token
 * @param clientId - ID of client to remove
 * @param abortSignal - Optional abort signal for cancellation
 * @returns RemoveClientResponse with error if failed
 */
export const removeClient = async (
  token: string,
  clientId: string,
  abortSignal?: AbortSignal
): Promise<RemoveClientResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/network/remove-client`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      console.error(
        "Remove client failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
          isAborted: false,
        },
      };
    }

    return await safeJsonParse<RemoveClientResponse>(response);
  } catch (error) {
    console.error("Remove client error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to remove client",
        isAborted: error instanceof Error && error.name === "AbortError",
      },
    };
  }
};

/**
 * Get provider statistics for the network
 * @param token - JWT authentication token
 * @returns StatsResponse with provider stats or error
 */
export const fetchProviderStats = async (
  token: string
): Promise<StatsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/stats/providers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      console.error(
        "Fetch stats failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        created_time: new Date().toISOString(),
        providers: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<StatsResponse>(response);

    // Ensure providers is always an array
    return {
      created_time: data.created_time || new Date().toISOString(),
      providers: Array.isArray(data.providers) ? data.providers : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch stats error:", error);
    return {
      created_time: new Date().toISOString(),
      providers: [],
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch provider stats",
      },
    };
  }
};

/**
 * Get network leaderboard
 * @param token - JWT authentication token
 * @returns LeaderboardResponse with leaderboard entries or error
 */
export const fetchLeaderboard = async (
  token: string
): Promise<LeaderboardResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/stats/leaderboard`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return {
        earners: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<LeaderboardResponse>(response);

    // Ensure earners is always an array
    return {
      earners: Array.isArray(data.earners) ? data.earners : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch leaderboard error:", error);
    return {
      earners: [],
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch leaderboard",
      },
    };
  }
};

/**
 * Get current user's network ranking
 * @param token - JWT authentication token
 * @returns NetworkRanking with rank info or error
 */
export const fetchNetworkRanking = async (
  token: string
): Promise<NetworkRanking> => {
  try {
    const response = await fetch(`${API_BASE_URL}/network/ranking`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        network_ranking: {
          net_mib_count: 0,
          leaderboard_rank: 0,
          leaderboard_public: false,
        },
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<NetworkRanking>(response);
  } catch (error) {
    console.error("Fetch network ranking error:", error);
    return {
      network_ranking: {
        net_mib_count: 0,
        leaderboard_rank: 0,
        leaderboard_public: false,
      },
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch network ranking",
      },
    };
  }
};

/**
 * Get all provider locations
 * @returns ProviderLocationsResponse with location data or error
 */
export const fetchProviderLocations =
  async (): Promise<ProviderLocationsResponse> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/network/provider-locations`,
        {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        }
      );

      if (!response.ok) {
        return {
          specs: [],
          groups: [],
          locations: [],
          devices: [],
          error: {
            message: `HTTP error! status: ${response.status}`,
          },
        };
      }

      const data = await safeJsonParse<ProviderLocationsResponse>(response);

      // Ensure all arrays are actually arrays
      return {
        specs: Array.isArray(data.specs) ? data.specs : [],
        groups: Array.isArray(data.groups) ? data.groups : [],
        locations: Array.isArray(data.locations) ? data.locations : [],
        devices: Array.isArray(data.devices) ? data.devices : [],
        error: data.error,
      };
    } catch (error) {
      console.error("Fetch provider locations error:", error);
      return {
        specs: [],
        groups: [],
        locations: [],
        devices: [],
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch provider locations",
        },
      };
    }
  };

/**
 * Find provider locations by search query
 * @param query - Search query string
 * @returns ProviderLocationsResponse with matching locations or error
 */
export const findProviderLocations = async (
  query: string
): Promise<ProviderLocationsResponse> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/network/find-provider-locations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          max_distance_fraction: 1,
          enable_max_distance_fraction: true,
        }),
      }
    );

    if (!response.ok) {
      return {
        specs: [],
        groups: [],
        locations: [],
        devices: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<ProviderLocationsResponse>(response);

    // Ensure all arrays are actually arrays
    return {
      specs: Array.isArray(data.specs) ? data.specs : [],
      groups: Array.isArray(data.groups) ? data.groups : [],
      locations: Array.isArray(data.locations) ? data.locations : [],
      devices: Array.isArray(data.devices) ? data.devices : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Find provider locations error:", error);
    return {
      specs: [],
      groups: [],
      locations: [],
      devices: [],
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to find provider locations",
      },
    };
  }
};

/**
 * Get wallet statistics (data transfer earnings)
 * @param token - JWT authentication token
 * @returns WalletStatsResponse with paid/unpaid bytes or error
 */
export const fetchWalletStats = async (
  token: string
): Promise<WalletStatsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transfer/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        paid_bytes_provided: 0,
        unpaid_bytes_provided: 0,
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<WalletStatsResponse>(response);

    // Ensure numeric fields are numbers
    return {
      paid_bytes_provided: typeof data.paid_bytes_provided === 'number' ? data.paid_bytes_provided : 0,
      unpaid_bytes_provided: typeof data.unpaid_bytes_provided === 'number' ? data.unpaid_bytes_provided : 0,
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch wallet stats error:", error);
    return {
      paid_bytes_provided: 0,
      unpaid_bytes_provided: 0,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch wallet stats",
      },
    };
  }
};

/**
 * Create a new authentication code
 * @param token - JWT authentication token
 * @param durationMinutes - How long the code is valid (in minutes)
 * @param uses - Number of times the code can be used
 * @returns CreateAuthCodeResponse with new code or error
 */
export const createAuthCode = async (
  token: string,
  durationMinutes: number,
  uses: number
): Promise<CreateAuthCodeResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/code-create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        duration_minutes: durationMinutes,
        uses: uses,
      }),
    });

    if (!response.ok) {
      console.error(
        "Create auth code failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<CreateAuthCodeResponse>(response);
  } catch (error) {
    console.error("Create auth code error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create authentication code",
      },
    };
  }
};

/**
 * Get account payment history
 * @param token - JWT authentication token
 * @returns AccountPaymentsResponse with payment transactions or error
 */
export const fetchAccountPayments = async (
  token: string
): Promise<AccountPaymentsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/account/payments`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        account_payments: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<AccountPaymentsResponse>(response);

    // Ensure account_payments is always an array
    return {
      account_payments: Array.isArray(data.account_payments) ? data.account_payments : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch account payments error:", error);
    return {
      account_payments: [],
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch account payments",
      },
    };
  }
};

/**
 * Request a password reset email
 * @param userAuth - User email or username
 * @returns PasswordResetResponse with error if failed
 */
export const requestPasswordReset = async (
  userAuth: string
): Promise<PasswordResetResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_auth: userAuth,
      }),
    });

    if (!response.ok) {
      console.error(
        "Password reset request failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<PasswordResetResponse>(response);
  } catch (error) {
    console.error("Password reset request error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to request password reset",
      },
    };
  }
};

/**
 * Get account points history
 * @param token - JWT authentication token
 * @returns AccountPointsResponse with points awards or error
 */
export const fetchAccountPoints = async (
  token: string
): Promise<AccountPointsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/account/points`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        account_points: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<AccountPointsResponse>(response);

    return {
      account_points: Array.isArray(data.account_points) ? data.account_points : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch account points error:", error);
    return {
      account_points: [],
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch account points",
      },
    };
  }
};

/**
 * Get network reliability statistics
 * @param token - JWT authentication token
 * @returns NetworkReliabilityResponse with reliability window data or error
 */
export const fetchNetworkReliability = async (
  token: string
): Promise<NetworkReliabilityResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/network/reliability`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<NetworkReliabilityResponse>(response);
  } catch (error) {
    console.error("Fetch network reliability error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch network reliability",
      },
    };
  }
};

/**
 * Get redeemed transfer balance codes
 * @param token - JWT authentication token
 * @returns RedeemedTransferBalanceCodesResponse with balance codes history or error
 */
export const fetchNetworkTransferBalanceCodes = async (
  token: string
): Promise<RedeemedTransferBalanceCodesResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/account/balance-codes`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        balance_codes: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<RedeemedTransferBalanceCodesResponse>(response);

    return {
      balance_codes: Array.isArray(data.balance_codes) ? data.balance_codes : [],
      error: data.error,
    };
  } catch (error) {
    console.error("Fetch network transfer balance codes error:", error);
    return {
      balance_codes: [],
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch network transfer balance codes",
      },
    };
  }
};

/**
 * Redeem transfer balance code to add data credit
 * @param balanceCode - The 26-character transfer balance code to redeem
 * @param token - JWT authentication token
 * @returns RedeemTransferBalanceCodeResponse with error if failed
 */
export const redeemTransferBalanceCode = async (
  balanceCode: string,
  token: string
): Promise<RedeemTransferBalanceCodeResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/redeem-balance-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "*/*",
      },
      body: JSON.stringify({
        secret: balanceCode,
      }),
    });

    if (!response.ok) {
      console.error(
        "Redeem transfer balance code request failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<RedeemTransferBalanceCodeResponse>(response);
  } catch (error) {
    console.error("Redeem transfer balance code request error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to redeem transfer balance code",
      },
    };
  }
};

// Export types for convenience
export type {
  AuthResponse,
  Client,
  ClientsResponse,
  RemoveClientResponse,
  Provider,
  StatsResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  NetworkRanking,
  ProviderLocationsResponse,
  LocationSpec,
  LocationGroup,
  ProviderLocation,
  Device,
  WalletStats,
  WalletStatsResponse,
  WalletStatsEntry,
  NetworkUser,
  NetworkUserResponse,
  CreateAuthCodeResponse,
  PasswordResetResponse,
  AccountPayment,
  AccountPaymentsResponse,
  AccountPoint,
  AccountPointsResponse,
  NetworkReliabilityResponse,
};
