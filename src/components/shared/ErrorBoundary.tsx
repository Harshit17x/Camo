import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { children } = this.props;
    if (this.state.hasError) {
      const isQuotaExceeded = this.state.error?.message?.includes('Quota exceeded') || 
                             this.state.error?.message?.includes('resource-exhausted');
      
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-black tracking-tighter italic text-white">
              {isQuotaExceeded ? 'Daily Limit Reached' : 'Something went wrong'}
            </h1>
            
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm leading-relaxed">
                {isQuotaExceeded 
                  ? "The application has reached its daily database usage limit (Firestore Spark Plan). This limit resets every 24 hours. We've optimized the app to reduce usage, but for now, please wait for the reset."
                  : "The application encountered an unexpected error. This might be due to a configuration issue or a temporary glitch."}
              </p>
              
              {isQuotaExceeded && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-left">
                  <h4 className="text-emerald-500 font-bold text-xs uppercase tracking-widest mb-1">What to do?</h4>
                  <ul className="text-zinc-400 text-[10px] list-disc list-inside space-y-1">
                    <li>Wait for the daily reset (usually at midnight UTC)</li>
                    <li>Check back later today</li>
                    <li>If you're the developer, consider upgrading your Firebase plan</li>
                  </ul>
                </div>
              )}
            </div>

            {this.state.error && !isQuotaExceeded && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-left overflow-auto max-h-48">
                <pre className="text-[10px] text-red-400 font-mono whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors w-full"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
