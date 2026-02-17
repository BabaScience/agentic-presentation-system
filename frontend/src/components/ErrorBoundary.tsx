import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches rendering errors in child components
 * and displays a styled fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          padding: 32,
          background: 'var(--bg-elevated, #10131c)',
          borderRadius: 'var(--radius, 12px)',
          border: '1px solid rgba(255,45,123,0.2)',
          color: 'var(--text-2, #9aa0a6)',
          textAlign: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: '2rem' }}>&#x26A0;</div>
          <p style={{ fontSize: '0.95rem', margin: 0, maxWidth: 400 }}>
            {this.props.fallbackMessage || 'Something went wrong.'}
          </p>
          {this.state.error && (
            <code style={{
              fontSize: '0.75rem',
              background: 'var(--bg-surface, #0b0d14)',
              padding: '6px 12px',
              borderRadius: 6,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--magenta, #ff2d7b)',
            }}>
              {this.state.error.message}
            </code>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid var(--border-accent, rgba(0,229,255,0.2))',
              borderRadius: 8,
              color: 'var(--cyan, #00e5ff)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
