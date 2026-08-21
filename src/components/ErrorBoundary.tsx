import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, Terminal, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    isChunkError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorMsg = error?.message || "";
    const isChunkError =
      errorMsg.includes("dynamically imported module") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Loading CSS chunk") ||
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("Importing a module script failed");

    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
      isChunkError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[JTG Panel UI Error]", error, errorInfo);
    this.setState({ errorInfo });

    // Send client error diagnostic telemetry to backend (non-blocking)
    try {
      if (typeof window !== "undefined" && typeof window.fetch === "function") {
        window.fetch("/api/system/client-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {});
      }
    } catch (_) {}
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardRefresh = () => {
    if (typeof window !== "undefined") {
      if ("caches" in window && window.caches) {
        window.caches.keys().then((names) => {
          names.forEach((name) => window.caches.delete(name));
        }).finally(() => {
          window.location.href = "/" + "?t=" + Date.now();
        });
      } else {
        window.location.href = "/" + "?t=" + Date.now();
      }
    }
  };

  private handleCopy = () => {
    const { error, errorInfo } = this.state;
    const diagnostics = [
      `JTG Panel UI Exception Report`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Error Message: ${error?.message || "Unknown Error"}`,
      `Stack Trace:`,
      error?.stack || "No stack trace",
      `Component Stack:`,
      errorInfo?.componentStack || "No component stack"
    ].join("\n\n");

    navigator.clipboard.writeText(diagnostics).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {});
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, copied, isChunkError } = this.state;

      return (
        <div id="error-boundary-container" className="min-h-screen w-full bg-[#0d1117] text-[#e6edf3] flex items-center justify-center p-4 sm:p-6 font-sans select-text">
          <div className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Ambient accent background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold tracking-tight text-white mb-1">
                  {isChunkError ? "Application Update Detected" : "Interface Runtime Exception"}
                </h1>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {isChunkError
                    ? "A newer version of JTG Panel was deployed or dynamic assets were refreshed. Reloading will sync your browser with the latest version."
                    : "An unexpected error occurred in the panel frontend. You can reload the interface or report this issue."}
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-2">
                <Terminal size={14} className="text-red-400" />
                <span>Error details</span>
              </div>
              <p className="font-mono text-sm text-red-300 break-words whitespace-pre-wrap selection:bg-red-900/50">
                {error?.message || "Unknown client error"}
              </p>

              {error?.stack && (
                <details className="mt-3 text-xs font-mono text-gray-500 cursor-pointer">
                  <summary className="hover:text-gray-300 transition-colors py-1">
                    View technical stack trace
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto bg-black/40 p-3 rounded-lg border border-[#21262d] text-gray-400 whitespace-pre-wrap leading-relaxed selection:bg-gray-800">
                    {error.stack}
                    {errorInfo?.componentStack}
                  </div>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="error-boundary-reload-btn"
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-900/20 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw size={16} />
                <span>Reload Panel</span>
              </button>

              <button
                id="error-boundary-hard-refresh-btn"
                type="button"
                onClick={this.handleHardRefresh}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-gray-200 hover:text-white text-sm font-medium border border-[#30363d] transition-all cursor-pointer active:scale-95"
              >
                <Home size={16} />
                <span>Clear Cache & Reset</span>
              </button>

              <button
                id="error-boundary-copy-btn"
                type="button"
                onClick={this.handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white text-sm font-medium border border-[#30363d] ml-auto transition-all cursor-pointer active:scale-95"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                <span>{copied ? "Copied" : "Copy Diagnostics"}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
