/** Keeps a store failure inside the store: a short message and Retry instead of a blank area. */
import { Component, type ReactNode } from 'react'
import type { Translate } from './common.tsx'

interface Props { t: Translate; children: ReactNode; onReset?: () => void }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: unknown): void {
    console.error('[dsh-startide]', error)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    const { t } = this.props
    return (
      <div className="ps-root ps-crash">
        <h3>{t('crashTitle')}</h3>
        <p className="ps-muted">{error.message}</p>
        <button type="button" className="ps-btn ps-btn-primary" onClick={() => { this.setState({ error: null }); this.props.onReset?.() }}>{t('retry')}</button>
      </div>
    )
  }
}
