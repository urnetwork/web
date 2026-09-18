import { z } from 'zod';

/**
 * Verified extension IDs (Chrome Web Store / Firefox Add-ons IDs).
 * Populate this list once the extensions are published.
 *
 * When the browser delivers the auth code via chrome.identity.launchWebAuthFlow,
 * the extension ID is proven by the browser runtime, so this list becomes a
 * allowlist for UI decoration only (e.g. "Verified extension" badge).
 */
export const VERIFIED_EXTENSION_IDS: string[] = [];

export const extensionParamsSchema = z.object({
  extension_id: z.string().optional(),
  extension_name: z.string().min(1, 'Extension name is required'),
  extension_version: z.string().min(1, 'Extension version is required'),
  state: z.string().min(8, 'State parameter must be at least 8 characters'),
  redirect_uri: z.string().url(),
});

export type ExtensionParams = z.infer<typeof extensionParamsSchema>;

export type VerifiedReason = 'verified-id' | 'unverified';

export type ExtensionValidationResult =
  | { success: true; data: ExtensionParams; isVerified: boolean; verifiedReason: VerifiedReason }
  | { success: false; error: string };

/**
 * Checks whether an extension ID is on the verified allowlist.
 *
 * With chrome.identity.launchWebAuthFlow the browser has already proven that
 * the code is going to the extension with this ID, but the allowlist lets us
 * show a "Verified extension" badge for known official builds.
 */
export function isVerifiedExtension(extensionId?: string): boolean {
  return Boolean(extensionId && VERIFIED_EXTENSION_IDS.includes(extensionId));
}

const CHROME_IDENTITY_HOST_SUFFIX = '.chromiumapp.org';

/**
 * Validates that the redirect_uri supplied by the extension is a browser-managed
 * identity redirect URL. This prevents a malicious extension or web page from
 * convincing the website to send the auth code to an arbitrary location.
 */
export function isValidExtensionRedirectUri(redirectUri: string): boolean {
  try {
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();

    // Chrome identity redirect: https://<extension-id>.chromiumapp.org/...
    if (host.endsWith(CHROME_IDENTITY_HOST_SUFFIX)) return true;

    // Firefox identity redirect variants
    if (host.endsWith('.mozilla.com') || host.endsWith('.allizom.org')) return true;

    return false;
  } catch {
    return false;
  }
}

export function validateExtensionParams(
  searchParams: URLSearchParams
): ExtensionValidationResult {
  const raw = {
    extension_id: searchParams.get('extension_id') ?? undefined,
    extension_name: searchParams.get('extension_name') ?? '',
    extension_version: searchParams.get('extension_version') ?? '',
    state: searchParams.get('state') ?? '',
    redirect_uri: searchParams.get('redirect_uri') ?? '',
  };

  const result = extensionParamsSchema.safeParse(raw);

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Invalid parameters' };
  }

  if (!isValidExtensionRedirectUri(result.data.redirect_uri)) {
    return { success: false, error: 'Invalid extension redirect URI' };
  }

  const isVerified = isVerifiedExtension(result.data.extension_id);
  const verifiedReason: VerifiedReason = isVerified ? 'verified-id' : 'unverified';

  return { success: true, data: result.data, isVerified, verifiedReason };
}

export function logExtensionAuthEvent(
  action: 'approve' | 'deny',
  extensionName: string,
  extensionVersion: string,
  isVerified: boolean
): void {
  console.warn(
    `[ExtensionAuth] action=${action} extension="${extensionName}" version="${extensionVersion}" verified=${isVerified} timestamp=${new Date().toISOString()}`
  );
}
