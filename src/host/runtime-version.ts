/** The running DSH version, read the way DSH itself checks plugin compatibility. */

type AppBoot = { getDshRuntimeVersion?: () => string }

/**
 * The running DSH version, or null when it cannot be read. Loaded lazily so a missing or changed
 * `@deepseek-ai/dsh-app-boot` can never stop the store from loading.
 */
export async function runtimeVersion(load: () => Promise<AppBoot> = () => import('@deepseek-ai/dsh-app-boot') as Promise<AppBoot>): Promise<string | null> {
  try {
    const version = (await load()).getDshRuntimeVersion?.()
    return typeof version === 'string' && version !== '' ? version : null
  } catch {
    return null
  }
}
