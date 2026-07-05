"use client";

import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  message?: string;
  className?: string;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  resetKey: number;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Section error boundary caught an error:", error, errorInfo);
    // Future: reportToMonitoring(error, { componentStack: errorInfo.componentStack });
  }

  reset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      resetKey: prev.resetKey + 1,
    }));
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return (
        <React.Fragment key={this.state.resetKey}>
          {this.props.children}
        </React.Fragment>
      );
    }

    return (
      <div
        role="alert"
        className={`rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center shadow-sm ${this.props.className || ""}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-extrabold tracking-tight text-foreground">
          {this.props.title || "This section could not load"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted">
          {this.props.message || "Something went wrong in this area. The rest of the portal is still available."}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90"
        >
          <RefreshCcw size={15} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }
}
