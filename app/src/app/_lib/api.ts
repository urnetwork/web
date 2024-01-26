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
 * Similar to a GET request, however this doesn't parse the response as json
 * and instead returns a Blob() object.
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
  return {};
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
  const codeType = body.code.startsWith("s") ? "share" : "adopt";
  await new Promise((r) => setTimeout(r, 1000));
  return {
    code_type: codeType,
    code: body.code,
    network_name: "test.bringyour.network",
    client_id: "test_client_id",
  };

  return makePostRequest("/device/add", body);
}

export async function postDeviceCreateShareCode(body: {
  client_id: string;
  device_name: string;
}): Promise<DeviceCreateShareCodeResult> {
  await new Promise((r) => setTimeout(r, 1000));
  return {
    share_code: "s19023hioj1n3jlk2n1l3kn912",
  };

  return makePostRequest("/device/create-share-code", body);
}

export async function getDeviceShareCodeQR(share_code: string) {
  const imgData = await makeResourceRequest(
    `/device/share-code/${share_code}/qr.png`
  );
  return URL.createObjectURL(imgData);
}

export async function postDeviceShareStatus(body: {
  share_code: string;
}): Promise<DeviceShareStatusResult> {
  await new Promise((r) => setTimeout(r, 5000));
  return {
    pending: false,
    associated_network_name: "test.bringyour.network",
  };
  return makePostRequest("/device/share-status", body);
}

export async function postDeviceConfirmShare(body: {
  share_code: string;
  confirm: boolean;
}): Promise<DeviceConfirmShareResult> {
  await new Promise((r) => setTimeout(r, 2000));
  return {
    complete: true,
    associated_network_name: "test.bringyour.network",
  };
  return makePostRequest("/device/confirm-share", body);
}

export async function postDeviceAdoptStatus(body: {
  share_code: string;
}): Promise<DeviceAdoptStatusResult> {
  await new Promise((r) => setTimeout(r, 1000));
  return {
    pending: true,
    associated_network_name: "test.bringyour.network",
  };
  return makePostRequest("/device/adopt-status", body);
}

export async function getDeviceAssociations(): Promise<DeviceAssociationsResult> {
  await new Promise((r) => setTimeout(r, 1000));
  return {
    pending_adoption_devices: [
      {
        code: "4a6f373254ff802590a75ec030ac57e7",
        device_name: "test_pending_adoption",
        client_id: "c48b43c2-6629-4cb2-9bb1-882c21f5b2b2",
      },
    ],
    incoming_shared_devices: [
      {
        pending: true,
        code: "f62f82bd648e013366227af68d5ae512",
        device_name: "test_incoming_shared_device",
        client_id: "829ce7df-0522-47c7-84ad-e48117b3f16f",
        network_name: "test.bringyour.network",
      },
      {
        pending: false,
        code: "asdj1213ae013366227af68d5ae512",
        device_name: "test_incoming_shared_device_confirmed",
        client_id: "0808e61f-84a8-4844-ac04-dc6a4847ad39",
        network_name: "test.bringyour.network",
      },
    ],
    outgoing_shared_devices: [
      {
        pending: true,
        code: "7ad2747fc5ca767577493f923a217aeb",
        device_name: "Awais second test device",
        client_id: "018d46d0-1ec7-f740-9248-28ab9cae20cd",
        network_name: "test.bringyour.network",
      },
      {
        pending: false,
        code: "7ad2747fc5ca767577493f923a217aeb",
        device_name: "Awais second test device",
        client_id: "018d46d0-1ec7-f740-9248-28ab9cae20cd",
        network_name: "test2.bringyour.network",
      },
    ],
  };

  return makeGetRequest("/device/associations");
}

export async function postDeviceRemoveAssociation(body: {
  code: string;
}): Promise<DeviceRemoveAssociationResult> {
  await new Promise((r) => setTimeout(r, 1000));
  return {
    client_id: "temp_client_id",
    network_name: "test.bringyour.network",
  };

  return makePostRequest("/device/remove-association", body);
}
