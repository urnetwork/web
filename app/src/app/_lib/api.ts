
/**
 * All code that makes calls to the BringYour API lives in this file.
 */

export function getJwt() {
    if (typeof localStorage == 'undefined') {
        return "no token" // Important that this is not null, because otherwise the app thinks the user is not logged in, and flashes the 'logged out' page.
    }
    return localStorage.getItem('byJwt')
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

export async function getNetworkClients() {
    return makeGetRequest("network/clients")
}