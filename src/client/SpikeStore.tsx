/**
 * Spike surface shared by the Plugins-page tab and the full-page panel: shows what the Host route read from the
 * index, offers one install check through the page's own dialog, and can crash on purpose to test isolation.
 * Plan 3 replaces this component with the real store.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { PluginTabInstall } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'

/** Route served by the Host half (`src/host/index-route.ts`); a literal because the browser half never imports Host code. */
const INDEX_ROUTE = '/api/plugin-store/index'

interface IndexSummary {
  ok: boolean
  title?: string | Record<string, string> | null
  pluginCount?: number
  sample?: { name: string; version: string } | null
  error?: string
}

type Load = { kind: 'loading' } | { kind: 'done'; summary: IndexSummary } | { kind: 'failed'; error: string }

/** Pick the Chinese title, else English, else the plain string. */
function titleText(title: IndexSummary['title']): string {
  if (!title) return '—'
  if (typeof title === 'string') return title
  return title.zh ?? title.en ?? Object.values(title)[0] ?? '—'
}

export interface SpikeStoreProps {
  /** Which surface renders it. */
  mode: 'tab' | 'panel'
  /** The Plugins page's install action; only the tab receives it. */
  install?: (target: PluginTabInstall) => void
}

/** The spike page. */
export function SpikeStore({ mode, install }: SpikeStoreProps): ReactNode {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [crash, setCrash] = useState(false)
  if (crash) throw new Error('plugin-store spike crash')

  useEffect(() => {
    let live = true
    fetch(INDEX_ROUTE)
      .then(async response => {
        const summary = await response.json() as IndexSummary
        if (live) setLoad(summary.ok ? { kind: 'done', summary } : { kind: 'failed', error: summary.error ?? `HTTP ${response.status}` })
      })
      .catch((error: unknown) => { if (live) setLoad({ kind: 'failed', error: String(error) }) })
    return () => { live = false }
  }, [])

  const sample = load.kind === 'done' ? load.summary.sample : null
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
      <h2 style={{ margin: 0 }}>插件商城 · 技术验证（{mode === 'tab' ? '标签页' : '整页面板'}）</h2>
      {load.kind === 'loading' && <p>正在读取索引…</p>}
      {load.kind === 'failed' && <p style={{ color: '#c62828' }}>读取索引失败：{load.error}</p>}
      {load.kind === 'done' && (
        <p>索引：{titleText(load.summary.title)}，共 {load.summary.pluginCount} 个插件</p>
      )}
      <p>安装能力：{install ? '有（来自插件页）' : '没有'}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={!install || !sample}
          onClick={() => { if (install && sample) install({ spec: `${sample.name}@${sample.version}`, title: sample.name, version: sample.version }) }}
        >
          测试安装 {sample ? `${sample.name}@${sample.version}` : ''}
        </button>
        <button type="button" onClick={() => { setCrash(true) }}>模拟崩溃</button>
      </div>
    </div>
  )
}

/** Sidebar icon: a shopping bag. */
export function StoreIcon({ size }: { size: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}
