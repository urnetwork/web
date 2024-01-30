/**
 * All code that makes calls to the BringYour API lives in this file.
 */

import { redirect } from "next/navigation";
import {
  AuthCodeLoginResult,
  DeviceAddResult,
  DeviceAdoptStatusResult,
  DeviceAssociationsResult,
  DeviceConfirmShareResult,
  DeviceCreateShareCodeResult,
  DeviceRemoveAssociationResult,
  DeviceSetProvideResult,
  DeviceShareStatusResult,
  NetworkClientsResult,
  RemoveNetworkClientResult,
  StatsProviderLast90,
  StatsProviders,
  StatsProvidersOverviewLast90Result,
  SubscriptionBalanceResult,
  SubscriptionCheckBalanceCodeResult,
  SubscriptionRedeemBalanceCodeResult,
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

/**
 * A GET request with authentication and error handling
 */
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

/**
 * A POST request with authentication and error handling
 */
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
 * Similar to a GET request, however this returns a Blob() object instead
 * of parsing the response as json.
 */
async function makeResourceRequest(endpoint: string) {
  const byJwt = getJwt();
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${byJwt}`,
    },
  });

  return response.blob();
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
  return makeGetRequest("stats/providers-overview-last-90");
}

export async function getStatsProviders(): Promise<StatsProviders> {
  return makeGetRequest("stats/providers");
}

export async function postStatsProviderLast90(body: {
  client_id: string;
}): Promise<StatsProviderLast90> {
  return makePostRequest("stats/provider-last-90", body);
}

export async function postRemoveNetworkClient(body: {
  client_id: string;
}): Promise<RemoveNetworkClientResult> {
  return makePostRequest("network/remove-client", body);
}

export async function postDeviceSetProvide(body: {
  client_id: string;
  provide_mode: number;
}): Promise<DeviceSetProvideResult> {
  return makePostRequest("devices/set-provide", body);
}

export async function postDeviceAdd(body: {
  code: string;
}): Promise<DeviceAddResult> {
  return makePostRequest("device/add", body);
}

export async function postDeviceCreateShareCode(body: {
  client_id: string;
  device_name: string;
}): Promise<DeviceCreateShareCodeResult> {
  return makePostRequest("device/create-share-code", body);
}

export async function getDeviceShareCodeQR(share_code: string) {
  const imgData = await makeResourceRequest(
    `device/share-code/${share_code}/qr.png`
  );
  return URL.createObjectURL(imgData);
}

export async function postDeviceShareStatus(body: {
  share_code: string;
}): Promise<DeviceShareStatusResult> {
  return makePostRequest("device/share-status", body);
}

export async function postDeviceConfirmShare(body: {
  share_code: string;
  confirm: boolean;
}): Promise<DeviceConfirmShareResult> {
  return makePostRequest("device/confirm-share", body);
}

export async function postDeviceAdoptStatus(body: {
  share_code: string;
}): Promise<DeviceAdoptStatusResult> {
  return makePostRequest("device/adopt-status", body);
}

export async function getDeviceAssociations(): Promise<DeviceAssociationsResult> {
  return makeGetRequest("device/associations");
}

export async function postDeviceRemoveAssociation(body: {
  code: string;
}): Promise<DeviceRemoveAssociationResult> {
  return makePostRequest("device/remove-association", body);
}

export async function getSubscriptionCheckBalanceCode(
  balance_code: string
): Promise<SubscriptionCheckBalanceCodeResult> {
  return makeGetRequest(
    `subscription/check-balance-code?balance_code=${balance_code}`
  );
}

export async function postSubscriptionRedeemBalanceCode(body: {
  balance_code: string;
}): Promise<SubscriptionRedeemBalanceCodeResult> {
  return makePostRequest("subscription/redeem-balance-code", body);
}
