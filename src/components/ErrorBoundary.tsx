import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-lg w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {this.props.fallbackTitle || 'بازیابی خودکار رابط کاربری'}
                </h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  یک خطای نمایشی مهار شد تا از قطع ارتباط یا کرش صفحه جلوگیری شود.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d] text-xs font-mono text-rose-300 overflow-x-auto" dir="ltr">
                <div className="font-bold text-rose-400 mb-1">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-[#8b949e] max-h-40 overflow-y-auto">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] font-semibold rounded-lg border border-[#30363d] transition"
              >
                تلاش مجدد رندر
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2 bg-[#238636] hover:bg-[#2ea043] text-xs text-white font-semibold rounded-lg shadow transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد برنامه</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
