import { Button } from "@carbon/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Top-level boundary so a render error shows a recovery screen, not a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Render error:", error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, maxWidth: 640 }}>
          <h2>Something went wrong</h2>
          <p style={{ color: "var(--cds-text-secondary)", margin: "8px 0 16px" }}>
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <Button onClick={() => window.location.assign("/")}>Reload app</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
