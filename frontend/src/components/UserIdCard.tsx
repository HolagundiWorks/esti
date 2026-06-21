import { UserAvatar } from "@carbon/icons-react";
import { HeaderGlobalAction, Link } from "@carbon/react";
import { useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useDismissOnOutsideClick } from "../lib/useDismissOnOutsideClick.js";
import { ROLE_TO_DISPLAY_LEVEL, STAFF_LEVEL_COLOR, STAFF_LEVEL_LABEL } from "@esti/contracts";
import { getInitials } from "./StaffAvatar.js";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner · L1",
  PARTNER: "Partner · L2",
  SENIOR: "Senior · L2",
  ASSOCIATE: "Associate · L3",
  VIEWER: "Viewer · L4",
  CONSULTANT: "Consultant",
  CLIENT: "Client",
};

/** Top-bar user icon → portrait ID card popover. */
export function UserIdCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const profileQ = trpc.users.myProfile.useQuery(undefined, {
    enabled: !!user && open,
    staleTime: 30_000,
  });

  useDismissOnOutsideClick(open, () => setOpen(false), [rootRef, fabRef]);

  if (!user) return null;

  const p = profileQ.data;
  const displayLevel = ROLE_TO_DISPLAY_LEVEL[user.role] ?? null;
  const roleColor = displayLevel ? (STAFF_LEVEL_COLOR[displayLevel] ?? "#525252") : "#525252";
  const initials = getInitials(user.fullName);
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const levelLabel = displayLevel ? STAFF_LEVEL_LABEL[displayLevel as keyof typeof STAFF_LEVEL_LABEL] : null;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <HeaderGlobalAction
        ref={fabRef}
        aria-label="My profile"
        isActive={open}
        onClick={() => setOpen((o) => !o)}
      >
        <UserAvatar size={20} />
      </HeaderGlobalAction>

      {open && (
        <div className="esti-id-card" role="dialog" aria-label="ID card">
          {/* Photo / initials area with role-colour overlay */}
          <div className="esti-id-card__photo-area">
            {p?.photoUrl ? (
              <img src={p.photoUrl} alt={user.fullName} className="esti-id-card__photo" />
            ) : (
              <div className="esti-id-card__initials-bg" style={{ background: roleColor }}>
                <span className="esti-id-card__initials">{initials}</span>
              </div>
            )}
            {/* Diagonal colour swatch + code badge (always shown over photo) */}
            {p?.photoUrl && (
              <div className="esti-id-card__overlay" style={{ background: roleColor }} />
            )}
            <div className="esti-id-card__badge">
              <span className="esti-id-card__badge-label">ESTI</span>
              {p?.userCode && (
                <span className="esti-id-card__badge-code">{p.userCode}</span>
              )}
            </div>
          </div>

          {/* Info body */}
          <div className="esti-id-card__body">
            <p className="esti-id-card__name">{user.fullName}</p>
            {p?.designation && (
              <p className="esti-id-card__designation">{p.designation}</p>
            )}
            <div className="esti-id-card__meta">
              <span className="esti-id-card__role-dot" style={{ background: roleColor }} />
              <span className="esti-label">{roleLabel}</span>
            </div>
            {levelLabel && (
              <span className="esti-id-card__level-badge" style={{ background: roleColor }}>
                {displayLevel} — {levelLabel.split("—")[1]?.trim()}
              </span>
            )}
            <Link
              as={RouterLink}
              to="/settings"
              onClick={() => setOpen(false)}
              className="esti-id-card__link"
            >
              Manage profile →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
