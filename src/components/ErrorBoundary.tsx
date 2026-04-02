import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="card glass-panel" style={{ maxWidth: '600px', textAlign: 'center' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Something went wrong.</h2>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left', overflowX: 'auto' }}>
              <code style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                {this.state.error?.message || "Unknown error"}
              </code>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              The application encountered an unexpected error during rendering. 
              This often happens if some weapon data is malformed in the Bungie manifest.
            </p>
            <button className="btn-primary" onClick={() => window.location.reload()} style={{ margin: '0 auto' }}>
              <RefreshCw size={18} /> Refresh Applicaton
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
