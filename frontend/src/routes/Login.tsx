import { Button, Form, InlineNotification, Stack, TextInput, Tile } from "@carbon/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

export function Login() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  return (
    <div style={{ maxWidth: 380, margin: "12vh auto", padding: "0 1rem" }}>
      <Tile>
        <h3 style={{ marginBottom: 4 }}>ESTI AORMS</h3>
        <p style={{ marginBottom: 24, color: "var(--cds-text-secondary)" }}>
          Architectural Office Resource Management System
        </p>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate({ email, password });
          }}
        >
          <Stack gap={5}>
            <TextInput
              id="email"
              labelText="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextInput
              id="password"
              labelText="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {login.error && (
              <InlineNotification
                kind="error"
                title="Sign-in failed"
                subtitle={login.error.message}
                hideCloseButton
                lowContrast
              />
            )}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
            <Link to="/" style={{ fontSize: "0.875rem" }}>← Back to home</Link>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
}
