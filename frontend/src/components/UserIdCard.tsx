import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import { IconButton, Link, Popover, Tooltip } from "@mui/material";
import { type CSSProperties, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
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

/** Footer user icon → portrait ID card in a portaled Popover (opens above). */
export function UserIdCard() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const profileQ = trpc.users.myProfile.useQuery(undefined, {
    enabled: !!user && open,
    staleTime: 30_000,
  });

  if (!user) return null;

  const p = profileQ.data;
  const displayLevel = ROLE_TO_DISPLAY_LEVEL[user.role] ?? null;
  const roleColor = STAFF_LEVEL_COLOR[displayLevel ?? "T3"] ?? STAFF_LEVEL_COLOR["T3"]!;
  const initials = getInitials(user.fullName);
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const levelLabel = displayLevel ? STAFF_LEVEL_LABEL[displayLevel as keyof typeof STAFF_LEVEL_LABEL] : null;

  return (
    <>
      <Tooltip title="My profile">
        <IconButton
          size="small"
          aria-label="My profile"
          color={open ? "primary" : "default"}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <AccountCircleOutlined />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 0 } } }}
      >
        <div className="esti-id-card esti-id-card--pop" role="dialog" aria-label="ID card"
          style={{ "--esti-staff-color": roleColor } as CSSProperties}>
          {/* Photo / initials area with role-colour overlay */}
          <div className="esti-id-card__photo-area">
            {p?.photoUrl ? (
              <img src={p.photoUrl} alt={user.fullName} className="esti-id-card__photo" />
            ) : (
              <div className="esti-id-card__initials-bg">
                <span className="esti-id-card__initials">{initials}</span>
              </div>
            )}
            {p?.photoUrl && <div className="esti-id-card__overlay" />}
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
              <span className="esti-id-card__role-dot" />
              <span className="esti-label">{roleLabel}</span>
            </div>
            {levelLabel && (
              <span className="esti-id-card__level-badge">
                {displayLevel} — {levelLabel.split("—")[1]?.trim()}
              </span>
            )}
            <Link
              component={RouterLink}
              to="/account"
              onClick={() => setAnchor(null)}
              className="esti-id-card__link"
            >
              View profile →
            </Link>
          </div>
        </div>
      </Popover>
    </>
  );
}
