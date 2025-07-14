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
  LocationSpec,
  LocationGroup,
  Device,
  NetworkUser,
  WalletStats,
  WalletStatsEntry,
  ProviderLocation,
} from "./types";

const API_BASE_URL = "/api";

// Authentication API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Email/Password login API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Get network user API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Get clients API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Remove client API
export const removeClient = async (
  token: string,
  clientId: string
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
    });

    if (!response.ok) {
      console.error(
        "Remove client failed:",
        response.status,
        response.statusText
      );
      const errorData = await response.text();
      console.error("Error response:", errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Remove client error:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to remove client",
      },
    };
  }
};

// Get provider stats API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Get leaderboard API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Get network ranking API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Get provider locations API
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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

// Find provider locations API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Get wallet stats API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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

// Create authentication code API
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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
};
