-- 0185 — One licence manager, two workspaces: each company picks its AORMS
-- workspace (STUDIO | CONSULTANCY) at creation; existing companies are Studio.
ALTER TABLE hlp_organization
  ADD COLUMN IF NOT EXISTS workspace_type text NOT NULL DEFAULT 'STUDIO';
