
/**
 * All code that makes calls to the BringYour API lives in this file.
 */

import {AuthCodeLoginResult, NetworkClientsResult, SubscriptionBalanceResult} from "./types";



export function getJwt() {
    if (typeof localStorage == 'undefined') {
        return "no token" // Important that this is not null, because otherwise the app thinks the user is not logged in, and flashes the 'logged out' page.
    }
    return localStorage.getItem('byJwt')
}

export function removeJwt() {
    if (typeof localStorage == 'undefined') {
        return
    }
    
    localStorage.removeItem("byJwt")
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.bringyour.com/";

async function makeGetRequest(endpoint: string) {
    const byJwt = getJwt();
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${byJwt}`,
          },
        });
   
    if (!response.ok) {
        throw new Error("Failed to fetch");
    }
      
    return response.json();
}

export async function postAuthCodeLogin(auth: string): Promise<AuthCodeLoginResult> {
    const response = await fetch(
        `${API_URL}auth/code-login`,
        {
          method: "POST",
          body: JSON.stringify({ auth_code: auth }),
        }
      );
      if (!response.ok) {
        new Error("API rejected access token");
      }
      return await response.json();
}

export async function getNetworkClients(): Promise<NetworkClientsResult> {
    return makeGetRequest("network/clients")
}

export async function getSubscriptionBalance(): Promise<SubscriptionBalanceResult> {
    return makeGetRequest("subscription/balance")
}