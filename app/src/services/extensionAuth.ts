import { z } from 'zod';

export const extensionParamsSchema = z.object({
  extension_name: z.string().min(1, 'Extension name is required'),
  extension_version: z.string().min(1, 'Extension version is required'),
  state: z.string().min(8, 'State parameter must be at least 8 characters'),
});

export type ExtensionParams = z.infer<typeof extensionParamsSchema>;

export function validateExtensionParams(
  searchParams: URLSearchParams
): { success: true; data: ExtensionParams } | { success: false; error: string } {
  const raw = {
    extension_name: searchParams.get('extension_name') ?? '',
    extension_version: searchParams.get('extension_version') ?? '',
    state: searchParams.get('state') ?? '',
  };

  const result = extensionParamsSchema.safeParse(raw);

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Invalid parameters' };
  }

  return { success: true, data: result.data };
}

export function logExtensionAuthEvent(
  action: 'approve' | 'deny',
  extensionName: string,
  extensionVersion: string
): void {
  console.warn(
    `[ExtensionAuth] action=${action} extension="${extensionName}" version="${extensionVersion}" timestamp=${new Date().toISOString()}`
  );
}
