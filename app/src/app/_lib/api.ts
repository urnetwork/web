/**
 * All code that makes calls to the BringYour API lives in this file.
 */

export function getJwt() {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('byJwt')
    }
    return null
}

const API_URL = "http://test.bringyour.com/"

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