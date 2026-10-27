/**
 * The last catalog read, kept on disk so the store opens at once after DSH restarts; a fresh catalog is then read
 * behind it. The copy is only a convenience: one that cannot be read or written is ignored, never an error.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { checkIndexShape, type IndexDocument } from './catalog-cache.ts'

export interface SavedCatalog {
  index: IndexDocument
  /** The source that served it. */
  indexUrl: string
  /** When it was read from that source. */
  savedAt: number
}

export interface DiskCopy {
  load(): Promise<SavedCatalog | null>
  save(copy: SavedCatalog): Promise<void>
}

/** `cache/startide/index.json` under the DSH home: `$DSH_HOME` when set and not blank, else `~/.dsh`, as DSH resolves it. */
export function defaultCopyFile(env: Record<string, string | undefined> = process.env): string {
  const home = env.DSH_HOME?.trim() ? resolve(env.DSH_HOME.trim()) : join(homedir(), '.dsh')
  return join(home, 'cache', 'startide', 'index.json')
}

export function createDiskCopy(file: string): DiskCopy {
  return {
    async load() {
      try {
        const copy = JSON.parse(await readFile(file, 'utf8'))
        checkIndexShape(copy?.index)
        return typeof copy.indexUrl === 'string' && typeof copy.savedAt === 'number' ? copy : null
      } catch {
        return null
      }
    },
    async save(copy) {
      // Written beside the target and renamed over it, so a crash mid-write never leaves a half file to load.
      const temporary = `${file}.${process.pid}.tmp`
      try {
        await mkdir(dirname(file), { recursive: true })
        await writeFile(temporary, JSON.stringify(copy))
        await rename(temporary, file)
      } catch {
        // The next read tries again.
      }
    },
  }
}
