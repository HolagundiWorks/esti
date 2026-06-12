-- Phase 5 foundation: ASPRF task fields, compliance PDF status, daily updates, timesheets, reward points

-- Task ASPRF fields
ALTER TABLE esti_task
  ADD COLUMN IF NOT EXISTS work_type text,
  ADD COLUMN IF NOT EXISTS difficulty_coefficient int2 DEFAULT 3,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric(6,2);

-- Compliance assessment PDF status
ALTER TABLE esti_site_assessment
  ADD COLUMN IF NOT EXISTS pdf_status text;

-- Daily stand-up updates (one per team member per day)
CREATE TABLE IF NOT EXISTS esti_daily_update (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES esti_teammember(id) ON DELETE CASCADE,
  update_date date NOT NULL,
  completed text,
  in_progress text,
  blockers text,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, update_date)
);
CREATE INDEX IF NOT EXISTS esti_daily_update_member_idx ON esti_daily_update(team_member_id);
CREATE INDEX IF NOT EXISTS esti_daily_update_date_idx ON esti_daily_update(update_date);

-- Timesheets: per-person per-day time attribution to project/task
CREATE TABLE IF NOT EXISTS esti_timesheet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES esti_teammember(id) ON DELETE CASCADE,
  project_id uuid REFERENCES esti_projectoffice(id) ON DELETE SET NULL,
  task_id uuid REFERENCES esti_task(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  hours numeric(5,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  billable boolean NOT NULL DEFAULT false,
  description text,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_timesheet_member_idx ON esti_timesheet(team_member_id);
CREATE INDEX IF NOT EXISTS esti_timesheet_date_idx ON esti_timesheet(entry_date);
CREATE INDEX IF NOT EXISTS esti_timesheet_project_idx ON esti_timesheet(project_id);

-- Reward points ledger for ASPRF recognition
CREATE TABLE IF NOT EXISTS esti_reward_point (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES esti_teammember(id) ON DELETE CASCADE,
  points int NOT NULL,
  reason text NOT NULL,
  award_type text,
  reference_id uuid,
  created_by_id uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_reward_point_member_idx ON esti_reward_point(team_member_id);
