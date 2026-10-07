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
  SubscriptionBalanceResponse,
  AuthClientRequest,
  AuthClientResponse,
  WalletAuthPayload,
  WalletAuthChallengeRequest,
  WalletAuthChallengeResponse,
  WalletLoginResponse,
  NetworkCreateRequest,
  NetworkCreateResponse,
  NetworkCheckResponse,
  VerifySendResponse,
  VerifyResponse,
  CreateApiKeyResult,
  GetApiKeysResult,
  DeleteApiKeyResult,
  ApiKeyMetadata,
  SeedphraseLoginResponse,
  InstantNetworkCreateResponse,
  SeedphraseResponse,
  AddAuthMethodRequest,
  AuthMethodMutationResponse,
  NetworkNameChangeResponse,
  RemoveClientsResponse,
} from "./types";

/** Build-time default API base (VITE_API_BASE env override, else production) */
export const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE ?? "https://api.bringyour.com";

/** localStorage key for the user's custom API server override */
export const CUSTOM_API_BASE_KEY = "urApiBase";

/**
 * The API base used for every request. A custom server set from the sign-in
 * page (stored in localStorage, like the iOS/Android network-server sheet)
 * takes precedence over the build-time default. Read per-request so changes
 * apply without a reload.
 */
export function getApiBase(): string {
  try {
    const custom = localStorage.getItem(CUSTOM_API_BASE_KEY);
    if (custom) return custom;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through to default
  }
  return DEFAULT_API_BASE;
}

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
    const response = await fetch(`${getApiBase()}/auth/code-login`, {
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
    const response = await fetch(`${getApiBase()}/auth/login-with-password`, {
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
 * Wallet-based login using Solana signature verification
 * @param payload - Wallet address, signed message, and signature
 * @returns WalletLoginResponse with network JWT or error
 */
export const loginWithWallet = async (
  payload: WalletAuthPayload
): Promise<WalletLoginResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wallet_auth: payload,
      }),
    });

    if (!response.ok) {
      console.error("Wallet login failed:", response.status, response.statusText);
      const errorData = await response.text();
      console.error("Error response:", errorData);

      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<WalletLoginResponse>(response);
  } catch (error) {
    console.error("Wallet login error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Wallet authentication failed",
      },
    };
  }
};

/**
 * Request a server-issued wallet authentication challenge.
 * The user must sign the returned `message_template`.
 */
export const fetchWalletChallenge = async (
  request: WalletAuthChallengeRequest
): Promise<WalletAuthChallengeResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/wallet-challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<WalletAuthChallengeResponse>(response);
    if ("success" in data) {
      return data;
    }
    return {
      success: true,
      ...data,
    };
  } catch (error) {
    console.error("Wallet challenge error:", error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : "Failed to fetch wallet challenge",
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
    const response = await fetch(`${getApiBase()}/network/user`, {
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
    const response = await fetch(`${getApiBase()}/network/clients`, {
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
    const response = await fetch(`${getApiBase()}/network/remove-client`, {
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
    const response = await fetch(`${getApiBase()}/stats/providers`, {
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
    const response = await fetch(`${getApiBase()}/stats/leaderboard`, {
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
    const response = await fetch(`${getApiBase()}/network/ranking`, {
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
        `${getApiBase()}/network/provider-locations`,
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
      `${getApiBase()}/network/find-provider-locations`,
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
    const response = await fetch(`${getApiBase()}/transfer/stats`, {
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
    const response = await fetch(`${getApiBase()}/auth/code-create`, {
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
    const response = await fetch(`${getApiBase()}/account/payments`, {
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
    const response = await fetch(`${getApiBase()}/auth/password-reset`, {
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
    const response = await fetch(`${getApiBase()}/account/points`, {
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
    const response = await fetch(`${getApiBase()}/network/reliability`, {
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
    const response = await fetch(`${getApiBase()}/account/balance-codes`, {
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
    const response = await fetch(`${getApiBase()}/subscription/redeem-balance-code`, {
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

/**
 * Get subscription balance
 * @param token - JWT authentication token
 * @returns SubscriptionBalanceResponse with balance info
 */
export const fetchSubscriptionBalance = async (
  token: string
): Promise<SubscriptionBalanceResponse|{error: {message: string}}> => {
  try {
    const response = await fetch(`${getApiBase()}/subscription/balance`, {
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

    return await safeJsonParse<SubscriptionBalanceResponse>(response);
  } catch (error) {
    console.error("Fetch subscription balance error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch subscription balance",
      },
    };
  }
};

/**
 * Create an authenticated client with proxy configuration
 * @param token - JWT authentication token
 * @param request - Auth client configuration
 * @returns AuthClientResponse with proxy credentials or error
 */
export const createAuthClient = async (
  token: string,
  request: AuthClientRequest
): Promise<AuthClientResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/network/auth-client`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      console.error(
        "Create auth client failed:",
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

    return await safeJsonParse<AuthClientResponse>(response);
  } catch (error) {
    console.error("Create auth client error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create auth client",
      },
    };
  }
};

interface NetworkDeleteResponse {
  error?: {
    message: string;
  };
}

export const deleteNetwork = async (
  token: string
): Promise<NetworkDeleteResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/network-delete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return {};
  } catch (error) {
    console.error("Network delete error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to delete account",
      },
    };
  }
};

export const createNetwork = async (
  request: NetworkCreateRequest
): Promise<NetworkCreateResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/network-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Create network error response:", errorData);
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<NetworkCreateResponse>(response);
  } catch (error) {
    console.error("Create network error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to create account",
      },
    };
  }
};

export const checkNetworkName = async (
  networkName: string
): Promise<NetworkCheckResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/network-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ network_name: networkName }),
    });

    if (!response.ok) {
      return { available: false };
    }

    return await safeJsonParse<NetworkCheckResponse>(response);
  } catch (error) {
    console.error("Check network name error:", error);
    return { available: false };
  }
};

export const sendVerificationCode = async (
  userAuth: string
): Promise<VerifySendResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/verify-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_auth: userAuth }),
    });

    if (!response.ok) {
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<VerifySendResponse>(response);
  } catch (error) {
    console.error("Send verification code error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
      },
    };
  }
};

export const verifyCode = async (
  userAuth: string,
  verifyCode: string
): Promise<VerifyResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_auth: userAuth, verify_code: verifyCode }),
    });

    if (!response.ok) {
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<VerifyResponse>(response);
  } catch (error) {
    console.error("Verify code error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to verify code",
      },
    };
  }
};

export const createApiKey = async (
  token: string,
  name: string
): Promise<CreateApiKeyResult> => {
  try {
    const response = await fetch(`${getApiBase()}/account/api-key`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<CreateApiKeyResult>(response);
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to create API key",
      },
    };
  }
};

export const fetchApiKeys = async (
  token: string
): Promise<GetApiKeysResult> => {
  try {
    const response = await fetch(`${getApiBase()}/account/api-keys`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        api_keys: [],
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    const data = await safeJsonParse<GetApiKeysResult>(response);

    return {
      api_keys: Array.isArray(data.api_keys) ? data.api_keys : [],
      error: data.error,
    };
  } catch (error) {
    return {
      api_keys: [],
      error: {
        message:
          error instanceof Error ? error.message : "Failed to fetch API keys",
      },
    };
  }
};

export const deleteApiKey = async (
  token: string,
  apiKeyId: string
): Promise<DeleteApiKeyResult> => {
  try {
    const response = await fetch(`${getApiBase()}/account/api-key/remove`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: apiKeyId }),
    });

    if (!response.ok) {
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<DeleteApiKeyResult>(response);
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to delete API key",
      },
    };
  }
};

/**
 * Seed-phrase login (server PR #406)
 * @param seedphrase - BIP39 mnemonic, whitespace-normalized
 * @returns SeedphraseLoginResponse with network JWT or error
 */
export const loginWithSeedphrase = async (
  seedphrase: string
): Promise<SeedphraseLoginResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seedphrase: seedphrase,
      }),
    });

    if (!response.ok) {
      console.error(
        "Seedphrase login failed:",
        response.status,
        response.statusText
      );
      return {
        error: {
          message: `HTTP error! status: ${response.status}`,
        },
      };
    }

    return await safeJsonParse<SeedphraseLoginResponse>(response);
  } catch (error) {
    console.error("Seedphrase login error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Seed phrase authentication failed",
      },
    };
  }
};

/**
 * Instant network creation with a generated seed phrase (server PR #406).
 * No auth fields sent — the server generates the account, a random network
 * name, and a 24-word seed phrase that is returned exactly once.
 * Rate limited to 5 signups per IP per day.
 */
export const createNetworkInstant =
  async (): Promise<InstantNetworkCreateResponse> => {
    try {
      const response = await fetch(`${getApiBase()}/auth/network-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          terms: true,
        }),
      });

      if (!response.ok) {
        console.error(
          "Instant network create failed:",
          response.status,
          response.statusText
        );
        return {
          error: {
            message:
              response.status === 429
                ? "Too many signups from this address today. Please try again tomorrow."
                : `HTTP error! status: ${response.status}`,
          },
        };
      }

      return await safeJsonParse<InstantNetworkCreateResponse>(response);
    } catch (error) {
      console.error("Instant network create error:", error);
      return {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to create network",
        },
      };
    }
  };

/**
 * Generate a seed phrase for an account that has none (server PR #406)
 * @param token - JWT authentication token
 */
export const generateSeedphrase = async (
  token: string
): Promise<SeedphraseResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/generate-seedphrase`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.error(
        "Generate seedphrase failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<SeedphraseResponse>(response);
  } catch (error) {
    console.error("Generate seedphrase error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate seed phrase",
      },
    };
  }
};

/**
 * Regenerate (replace) the account's existing seed phrase (server PR #406).
 * The previous phrase stops working immediately.
 * @param token - JWT authentication token
 */
export const regenerateSeedphrase = async (
  token: string
): Promise<SeedphraseResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/regenerate-seedphrase`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.error(
        "Regenerate seedphrase failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<SeedphraseResponse>(response);
  } catch (error) {
    console.error("Regenerate seedphrase error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to regenerate seed phrase",
      },
    };
  }
};

/**
 * Bind an additional auth method to the current account (server PR #406).
 * Exactly one mode per call: password, SSO jwt, or wallet.
 * @param token - JWT authentication token
 */
export const addAuthMethod = async (
  token: string,
  request: AddAuthMethodRequest
): Promise<AuthMethodMutationResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/add-auth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      console.error(
        "Add auth method failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<AuthMethodMutationResponse>(response);
  } catch (error) {
    console.error("Add auth method error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to add auth method",
      },
    };
  }
};

/**
 * Remove an auth method from the current account (server PR #406).
 * The server refuses to remove the last remaining method.
 * @param token - JWT authentication token
 * @param authType - "email" | "phone" | "apple" | "google" | "solana" | "seedphrase"
 */
export const removeAuthMethod = async (
  token: string,
  authType: string
): Promise<AuthMethodMutationResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/auth/remove-auth`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_type: authType,
      }),
    });

    if (!response.ok) {
      console.error(
        "Remove auth method failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<AuthMethodMutationResponse>(response);
  } catch (error) {
    console.error("Remove auth method error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove auth method",
      },
    };
  }
};

/**
 * Change the network name (server PR #406). Requires a verified email or SSO
 * login on the account; the old name enters a 24h reclaim cooldown.
 * @param token - JWT authentication token
 */
export const changeNetworkName = async (
  token: string,
  networkName: string
): Promise<NetworkNameChangeResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/account/change-name`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        network_name: networkName,
      }),
    });

    if (!response.ok) {
      console.error(
        "Change network name failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<NetworkNameChangeResponse>(response);
  } catch (error) {
    console.error("Change network name error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to change network name",
      },
    };
  }
};

/**
 * Claim a custom network name for the first time (server PR #406).
 * Same requirements as change-name but without the 24h cooldown.
 * @param token - JWT authentication token
 */
export const claimNetworkName = async (
  token: string,
  networkName: string
): Promise<NetworkNameChangeResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/account/claim-name`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        network_name: networkName,
      }),
    });

    if (!response.ok) {
      console.error(
        "Claim network name failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<NetworkNameChangeResponse>(response);
  } catch (error) {
    console.error("Claim network name error:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to claim network name",
      },
    };
  }
};

/**
 * Bulk-remove network clients in one call (server PR #406).
 * <=10k ids apply synchronously (empty response); more are scheduled as a
 * background task ({scheduled: true}). {already_in_progress: true} means a
 * bulk run for this network is still active — retry later. Max 1M ids.
 * @param token - JWT authentication token
 * @param clientIds - client ids to deactivate
 */
export const removeClients = async (
  token: string,
  clientIds: string[]
): Promise<RemoveClientsResponse> => {
  try {
    const response = await fetch(`${getApiBase()}/network/remove-clients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_ids: clientIds,
      }),
    });

    if (!response.ok) {
      console.error(
        "Remove clients failed:",
        response.status,
        response.statusText
      );
      return {
        error: { message: `HTTP error! status: ${response.status}` },
      };
    }

    return await safeJsonParse<RemoveClientsResponse>(response);
  } catch (error) {
    console.error("Remove clients error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to remove clients",
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
  AuthClientRequest,
  AuthClientResponse,
  WalletAuthPayload,
  WalletAuthChallengeRequest,
  WalletAuthChallengeResponse,
  WalletLoginResponse,
  NetworkCreateRequest,
  NetworkCreateResponse,
  NetworkCheckResponse,
  VerifySendResponse,
  VerifyResponse,
  CreateApiKeyResult,
  GetApiKeysResult,
  DeleteApiKeyResult,
  ApiKeyMetadata,
  SeedphraseLoginResponse,
  InstantNetworkCreateResponse,
  SeedphraseResponse,
  AddAuthMethodRequest,
  AuthMethodMutationResponse,
  NetworkNameChangeResponse,
  RemoveClientsResponse,
};
