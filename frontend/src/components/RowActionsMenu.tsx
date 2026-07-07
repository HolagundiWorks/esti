import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { useState } from "react";

/**
 * Row actions collapsed into a single "⋯" text menu — the stage stays button-free
 * (per the "no action buttons in the stage" rule). Each action is a plain text
 * menu item; destructive actions render in the error colour. Falsy entries are
 * skipped so callers can inline conditionals.
 */
export type RowAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function RowActionsMenu({
  actions,
  ariaLabel = "Row actions",
}: {
  actions: Array<RowAction | false | null | undefined>;
  ariaLabel?: string;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const items = actions.filter(Boolean) as RowAction[];
  if (items.length === 0) return null;
  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreHorizIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {items.map((a, i) => (
          <MenuItem
            key={a.label}
            disabled={a.disabled}
            onClick={() => {
              setAnchor(null);
              a.onClick();
            }}
            sx={{
              color: a.danger ? "error.main" : undefined,
              borderBottom: i < items.length - 1 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            {a.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
