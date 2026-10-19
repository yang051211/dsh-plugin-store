/** The one export the store reads from DSH's boot package (loaded lazily; see runtime-version.ts). */
declare module '@deepseek-ai/dsh-app-boot' {
  export function getDshRuntimeVersion(): string
}
