import { Button, Content, InlineNotification, Stack } from "@carbon/react";
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
        <Content>
          <Stack gap={5}>
            <InlineNotification
              kind="error"
              title="Something went wrong"
              subtitle={this.state.error.message || "An unexpected error occurred."}
              hideCloseButton
              lowContrast
            />
            <Button onClick={() => window.location.assign("/")}>Reload app</Button>
          </Stack>
        </Content>
      );
    }
    return this.props.children;
  }
}
