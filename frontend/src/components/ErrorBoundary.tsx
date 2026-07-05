import { Alert, Box, Button, Stack } from "@mui/material";
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
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Alert severity="error">
              {this.state.error.message || "An unexpected error occurred."}
            </Alert>
            <Box>
              <Button variant="contained" onClick={() => window.location.assign("/")}>
                Reload app
              </Button>
            </Box>
          </Stack>
        </Box>
      );
    }
    return this.props.children;
  }
}
