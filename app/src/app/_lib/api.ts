/**
 * All code that makes calls to the BringYour API lives in this file.
 */

import { redirect } from "next/navigation";
import {AuthCodeLoginResult, NetworkClientsResult, SubscriptionBalanceResult} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.bringyour.com/";
export const LOGIN_URL = "https://bringyour.com?auth"

export function getJwt() {
    if (typeof localStorage == 'undefined') {
        return null
    }
    return localStorage.getItem('byJwt')
}

export function removeJwt() {
    if (typeof localStorage == 'undefined') {
        return
    }
    
    localStorage.removeItem("byJwt")
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
            removeJwt()
            redirect(LOGIN_URL)
        }

        // Todo(awais): Improve error handling on network requests
        throw new Error("Failed to fetch");
    }
      
    return response.json();
}

/**
 * Swap authorization code for an access token (JWT)
 */
export async function postAuthCodeLogin(auth: string): Promise<AuthCodeLoginResult> {
    const response = await fetch(
        `${API_URL}auth/code-login`,
        {
          method: "POST",
          body: JSON.stringify({ auth_code: auth }),
        }
      );

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
            throw new Error("API rejected the access token");
        }
      }
      return await response.json();
}

export async function getNetworkClients(): Promise<NetworkClientsResult> {
    return makeGetRequest("network/clients")
}

export async function getSubscriptionBalance(): Promise<SubscriptionBalanceResult> {
    return makeGetRequest("subscription/balance")
}