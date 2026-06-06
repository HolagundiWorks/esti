import { Tile } from "@carbon/react";
import { trpc } from "../lib/trpc.js";

export function Dashboard() {
  const health = trpc.health.useQuery();
  const profile = trpc.profile.useQuery();

  return (
    <div>
      <h1>Office dashboard</h1>
      <p>Architectural Office Resource Management System</p>
      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        <Tile>
          <h4>Backend</h4>
          <p>{health.data?.ok ? "Connected" : "…"}</p>
        </Tile>
        <Tile>
          <h4>Currency</h4>
          <p>{profile.data?.currency ?? "INR"}</p>
        </Tile>
        <Tile>
          <h4>Regular GST</h4>
          <p>{profile.data ? `${profile.data.gstRates.REGULAR}%` : "18%"}</p>
        </Tile>
      </div>
    </div>
  );
}
