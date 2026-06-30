"use client";

import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f6f2] p-6">
          <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-red-600">Something went wrong</p>
            <p className="mt-2 text-sm text-[#5C6670]">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-[#0891b2] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0369a1]"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
