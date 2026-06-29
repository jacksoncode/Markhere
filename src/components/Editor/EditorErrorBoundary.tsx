import { Component, ErrorInfo, ReactNode } from 'react';

interface EditorErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<EditorErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[EditorErrorBoundary] Render error:', error);
    console.error('[EditorErrorBoundary] Component stack:', errorInfo.componentStack);
    console.error('[EditorErrorBoundary] Error keys:', Object.keys(error));
    console.error('[EditorErrorBoundary] Error toString:', String(error));
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p style={{ fontSize: 14, margin: '0 0 8px' }}>内容渲染失败</p>
          <p style={{ fontSize: 12, margin: '0 0 12px', fontFamily: 'monospace' }}>
            {this.state.error?.message?.slice(0, 120) ?? 'Unknown error'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
