import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary - Catches React crashes and shows recovery UI
 * Prevents blue screen of death
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo
    });

    // Log to external service if configured
    if (typeof window !== 'undefined' && (window as any).logError) {
      (window as any).logError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-slate-800 rounded-lg p-8 border-2 border-red-500">
            <div className="flex items-center gap-4 mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Simulation Crashed</h1>
                <p className="text-slate-400">SnapLock encountered an error and stopped</p>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded mb-6 font-mono text-sm overflow-auto max-h-64">
              <p className="text-red-400 font-bold mb-2">Error:</p>
              <p className="text-white">{this.state.error?.message}</p>

              {this.state.error?.stack && (
                <>
                  <p className="text-red-400 font-bold mt-4 mb-2">Stack Trace:</p>
                  <pre className="text-slate-300 text-xs whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-white font-bold">Common Causes:</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-2">
                <li>Physics engine overload (too many particles)</li>
                <li>WebGL context loss (GPU driver issue)</li>
                <li>Invalid physics parameters (NaN values)</li>
                <li>GLB model loading failure</li>
              </ul>

              <h2 className="text-white font-bold mt-6">Recovery Actions:</h2>
              <div className="flex gap-4">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
              </div>

              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded">
                <p className="text-yellow-400 text-sm">
                  <strong>Tip:</strong> If crashes persist, try reducing particle count or disabling Chaos Mode.
                  Check browser console (F12) for detailed error logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
