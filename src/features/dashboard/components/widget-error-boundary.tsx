import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode; resetKey?: string }
interface State { error: Error | null }

/** One failing panel must not take the whole dashboard down. (React still needs a class for this.) */
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Widget failed', error, info.componentStack) }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="m-3 rounded-xl bg-[#f7e0e6] p-3 text-xs text-[#8e1f33]">
        Este panel ha fallado: {this.state.error.message}
        <button type="button" onClick={() => this.setState({ error: null })} className="ml-2 font-semibold underline">Reintentar</button>
      </div>
    )
  }
}
