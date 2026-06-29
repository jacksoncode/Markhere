import { Component, ErrorInfo, ReactNode } from 'react';
import { useNotificationStore } from '../Notification/Notification';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console for debugging
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Notify user via toast system
    try {
      const { notify } = useNotificationStore.getState();
      notify('error', error.message || 'An unexpected error occurred', 'Application Error', 0);
    } catch {
      // Notification store may not be available during initial render
    }
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const err = this.state.error;
      const found = (err as any)?.found ?? (err as any)?.reason ?? null;
      const foundStr = found === null ? '' : typeof found === 'object' ? JSON.stringify(found, null, 2).slice(0, 300) : String(found);

      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <div className="error-boundary__icon">!</div>
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              {err?.message ?? 'An unexpected error occurred while rendering the application.'}
            </p>
            {foundStr && (
              <pre className="error-boundary__found" style={{ background: 'var(--color-bg-secondary)', padding: 8, borderRadius: 4, fontSize: 11, overflow: 'auto', maxHeight: 120, margin: '8px 0' }}>
                {foundStr}
              </pre>
            )}
            <button
              className="error-boundary__reload"
              onClick={this.handleReload}
              type="button"
            >
              Reload
            </button>
            {this.state.errorInfo && (
              <details className="error-boundary__details">
                <summary>Stack trace</summary>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
