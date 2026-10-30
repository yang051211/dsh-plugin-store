/**
 * The store's changes to installed plugins, kept outside the Installed page. A change takes tens of seconds, and the
 * page unmounts whenever someone opens another tab or DSH recomposes it; coming back shows the change still running,
 * or how it ended, and the same plugin cannot be changed twice at once.
 */
import type { InstalledRow, InstalledRows } from '../model/installed.ts'

export type Action = 'enable' | 'remove' | 'update'

export interface RowChange {
  action: Action
  /** Waiting behind another change; DSH makes them one at a time. */
  waiting: boolean
  /** The row as it was when an update started: the update may uninstall before it installs, and the row stays put. */
  pinned: { row: InstalledRow; group: keyof InstalledRows } | null
}

/** An outcome under a row; it keeps the row's title, so it outlives a row that a refresh removed. */
export interface RowNote { title: string; text: string; error: boolean }

export interface ChangeState { changes: Record<string, RowChange>; notes: Record<string, RowNote> }

export interface ChangeBook {
  get: () => ChangeState
  subscribe: (listener: () => void) => () => void
  update: (next: (state: ChangeState) => ChangeState) => void
}

export function createChangeBook(): ChangeBook {
  let state: ChangeState = { changes: {}, notes: {} }
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    update: next => { state = next(state); for (const listener of listeners) listener() },
  }
}

export function without<T>(record: Record<string, T>, name: string): Record<string, T> {
  const { [name]: _, ...rest } = record
  return rest
}
