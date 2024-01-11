/**
 * All code that makes calls to the BringYour API lives in this file.
 */

import { redirect } from "next/navigation";
import {
  AuthCodeLoginResult,
  NetworkClientsResult,
  StatsProviderLast90,
  StatsProviders,
  StatsProvidersOverviewLast90Result,
  SubscriptionBalanceResult,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.bringyour.com/";
export const LOGIN_URL = "https://bringyour.com?auth";

export function getJwt() {
  if (typeof localStorage == "undefined") {
    return null;
  }
  return localStorage.getItem("byJwt");
}

export function removeJwt() {
  if (typeof localStorage == "undefined") {
    return;
  }

  localStorage.removeItem("byJwt");
}

async function makeGetRequest(endpoint: string) {
  const byJwt = getJwt();
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${byJwt}`,
    },
  });

  if (!response.ok) {
    if ([401, 403].includes(response.status)) {
      // Unauthorized. User needs to refresh JWT token
      removeJwt();
      redirect(LOGIN_URL);
    }

    // Todo(awais): Improve error handling on network requests
    throw new Error("Failed to fetch");
  }

  return response.json();
}

async function makePostRequest(endpoint: string, body: object) {
  const byJwt = getJwt();
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${byJwt}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Post request failed");
  }
  return response.json();
}

/**
 * Swap authorization code for an access token (JWT)
 */
export async function postAuthCodeLogin(
  auth: string
): Promise<AuthCodeLoginResult> {
  const response = await fetch(`${API_URL}auth/code-login`, {
    method: "POST",
    body: JSON.stringify({ auth_code: auth }),
  });

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new Error("API rejected the access token");
    }
    throw new Error("Failed to log in.");
  }
  return await response.json();
}

export async function getNetworkClients(): Promise<NetworkClientsResult> {
  return makeGetRequest("network/clients");
}

export async function getSubscriptionBalance(): Promise<SubscriptionBalanceResult> {
  return makeGetRequest("subscription/balance");
}

export async function getStatsProvidersOverviewLast90(): Promise<StatsProvidersOverviewLast90Result> {
  return {
    lookback: 0,
    created_time: "2024-01-04",
    uptime: {
      "2024-01-04": 22,
      "2024-01-03": 20,
      "2024-01-02": 16,
      "2024-01-01": 26,
    },
    transfer_data: {
      "2024-01-04": 24.6,
      "2024-01-03": 16.9,
      "2024-01-02": 20.2,
      "2024-01-01": 13.6,
    },
    payout: {
      "2024-01-04": 0.66,
      "2024-01-03": 0.98,
      "2024-01-02": 1.33,
      "2024-01-01": 2.21,
    },
    search_interest: {
      "2024-01-04": 96,
      "2024-01-03": 84,
      "2024-01-02": 17,
      "2024-01-01": 73,
    },
    contracts: {
      "2024-01-04": 10,
      "2024-01-03": 9,
      "2024-01-02": 8,
      "2024-01-01": 11,
    },
    clients: {
      "2024-01-04": 12,
      "2024-01-03": 9,
      "2024-01-02": 8,
      "2024-01-01": 11,
    },
  } as StatsProvidersOverviewLast90Result;

  return makeGetRequest("stats/providers-overview-last-90");
}

export async function getStatsProviders(): Promise<StatsProviders> {
  return {
    created_time: "2024-01-04",
    providers: [
      {
        client_id: "018c1ccd-c1b5-36bb-b8ae-963599ed7531",
        connected: true,
        connected_events_last_24h: [
          {
            event_time: "2024-01-03 00:00",
            connected: true,
          },
          {
            event_time: "2024-01-03 04:17",
            connected: false,
          },
          {
            event_time: "2024-01-03 05:54",
            connected: true,
          },
          {
            event_time: "2024-01-03 12:16",
            connected: false,
          },
          {
            event_time: "2024-01-03 15:31",
            connected: true,
          },
          {
            event_time: "2024-01-03 21:00",
            connected: false,
          },
          {
            event_time: "2024-01-03 22:35",
            connected: true,
          },
        ],
        uptime_last_24h: 22,
        transfer_data_last_24h: 16.1,
        payout_last_24h: 0.554,
        search_interest_last_24h: 71,
        contracts_last_24h: 5,
        clients_last_24h: 17,
      },
      {
        client_id: "018bab71-1f15-a845-1ca1-b17a61c72c4c",
        connected: false,
        connected_events_last_24h: [],
        uptime_last_24h: 18,
        transfer_data_last_24h: 8.1,
        payout_last_24h: 0.215,
        search_interest_last_24h: 52,
        contracts_last_24h: 3,
        clients_last_24h: 9,
      },
    ],
  };

  return makeGetRequest("stats/providers");
}

export async function postStatsProviderLast90(
  body: object
): Promise<StatsProviderLast90> {
  return {
    lookback: 0,
    created_time: "2024-01-04",
    uptime: {
      "2024-01-04": 22,
      "2024-01-03": 20,
      "2024-01-02": 16,
      "2024-01-01": 26,
    },
    transfer_data: {
      "2024-01-04": 24.6,
      "2024-01-03": 16.9,
      "2024-01-02": 20.2,
      "2024-01-01": 13.6,
    },
    payout: {
      "2024-01-04": 0.66,
      "2024-01-03": 0.98,
      "2024-01-02": 1.33,
      "2024-01-01": 2.21,
    },
    search_interest: {
      "2024-01-04": 96,
      "2024-01-03": 84,
      "2024-01-02": 17,
      "2024-01-01": 73,
    },
    contracts: {
      "2024-01-04": 10,
      "2024-01-03": 9,
      "2024-01-02": 8,
      "2024-01-01": 11,
    },
    clients: {
      "2024-01-04": 12,
      "2024-01-03": 9,
      "2024-01-02": 8,
      "2024-01-01": 11,
    },
    client_details: [
      {
        client_id: "0c5a0b3c-b54d-4ec4-9749-360a11d2de59",
        transfer_data: {},
      },
      {
        client_id: "5e1ad27d-1b14-478c-ad66-097a006c1def",
        transfer_data: {},
      },
      {
        client_id: "e5542838-ede3-4bf5-8730-d109cc2b5247",
        transfer_data: {},
      },
    ],
  } as StatsProviderLast90;

  return makePostRequest("stats/provider-last-90", body);
}
