"use client";

import { Component, type ReactNode } from "react";

interface OmnistonErrorBoundaryProps {
  children: ReactNode;
}

interface OmnistonErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class OmnistonErrorBoundary extends Component<
  OmnistonErrorBoundaryProps,
  OmnistonErrorBoundaryState
> {
  state: OmnistonErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): OmnistonErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected Omniston error.",
    };
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-200">
              Swap service unavailable
            </h2>
            <p className="mt-2 text-sm text-red-100/80">{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
