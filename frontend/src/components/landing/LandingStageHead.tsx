/** Stage-head zone row — mirrors Studio Intelligence zone health (HCW L1/L3). */
const ZONES = [
  { id: "projects", label: "Projects", state: "stable" as const },
  { id: "fees", label: "Fees", state: "stable" as const },
  { id: "revisions", label: "Revisions", state: "watch" as const },
  { id: "team", label: "Team", state: "stable" as const },
  { id: "gst", label: "GST", state: "stable" as const },
] as const;

export function LandingStageHead() {
  return (
    <header className="esti-lp-stage-head" aria-label="Practice zones">
      <div className="esti-lp-stage-head__rule" aria-hidden />
      <div className="esti-lp-stage-head__row">
        <p className="esti-lp-stage-head__title">One record across every zone</p>
        <ul className="esti-lp-stage-head__zones">
          {ZONES.map((z) => (
            <li key={z.id} className="esti-lp-stage-head__zone">
              <span
                className={`esti-lp-zone-orb esti-lp-zone-orb--${z.state}`}
                aria-hidden
              />
              <span>{z.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
