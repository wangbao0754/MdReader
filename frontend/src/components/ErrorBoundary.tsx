import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 text-red-900 p-10">
          <h1 className="text-2xl font-bold mb-4">程序遇到了一点问题</h1>
          <p className="mb-4">请尝试重新启动软件。如果问题持续，请截图反馈。</p>
          <div className="bg-white p-4 rounded shadow border border-red-200 text-left overflow-auto max-w-2xl max-h-96 w-full">
            <p className="font-mono text-sm font-bold text-red-600 mb-2">
              {this.state.error?.toString()}
            </p>
            <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
