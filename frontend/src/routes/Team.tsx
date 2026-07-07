import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import {
  EMPLOYMENT_TYPES,
  type EmploymentTypeCode,
  TEAM_ROLES,
  type TeamRoleCode,
  formatINR,
  parseRupeeInput,
} from "@esti/contracts";
import { type CSSProperties, useState } from "react";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { DataState } from "../components/DataState.js";
import { CardGridSkeleton } from "../components/CardGridSkeleton.js";
import { TeamsPanel } from "../components/TeamsPanel.js";
import { getInitials, resolveColor } from "../components/StaffAvatar.js";
import { STAFF_LEVEL_LABEL } from "@esti/contracts";
import { trpc } from "../lib/trpc.js";

export function Team({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.team.list.useQuery();
  const update = trpc.team.update.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "ARCHITECT" as TeamRoleCode,
    employmentType: "FULL_TIME" as EmploymentTypeCode,
    email: "",
    phone: "",
    salary: "",
    dateJoined: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setOpen(false);
      setForm({
        name: "",
        role: "ARCHITECT",
        employmentType: "FULL_TIME",
        email: "",
        phone: "",
        salary: "",
        dateJoined: "",
      });
    },
  });

  const members = (list.data ?? []).filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <RailLayout
        title="Team"
        description="Office team members, roles, employment type and monthly salary."
        actions={
          <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
            New member
          </Button>
        }
        aside={
          <Stack spacing={1.5}>
            <TextField
              id="team-search"
              label="Search team"
              placeholder="Search team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
          </Stack>
        }
      >
      {/* Portrait tile grid */}
      <DataState
        loading={list.isLoading}
        isEmpty={members.length === 0}
        skeleton={<CardGridSkeleton />}
        empty={{
          title: search ? "No matches" : "No team members yet",
          description: search
            ? `No staff match "${search}".`
            : "Add staff to enable HR, payroll and project team tracking.",
        }}
      >
        <Grid container spacing={2}>
          {members.map((m) => {
            const color = resolveColor({ staffLevel: m.staffLevel ?? null, name: m.name });
            const initials = getInitials(m.name);
            const levelKey = m.staffLevel as keyof typeof STAFF_LEVEL_LABEL | undefined;
            const levelLabel = levelKey ? STAFF_LEVEL_LABEL[levelKey] : null;
            const contact = m.email ?? m.phone ?? null;
            return (
              <Grid key={m.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <Box
                  className="esti-staff-tile"
                  sx={{ p: 0, overflow: "hidden", height: 1, borderBottom: 1, borderColor: "divider" }}
                  style={{ "--esti-staff-color": color } as CSSProperties}
                >
                  {/* Portrait photo area — color fill + large initials */}
                  <div className="esti-staff-tile__photo">
                    <span className="esti-staff-tile__initials">{initials}</span>
                    {/* Diagonal accent strip at bottom-left */}
                    <div className="esti-staff-tile__accent" />
                  </div>

                  {/* Info panel */}
                  <div className="esti-staff-tile__info">
                    <div className="esti-staff-tile__top-row">
                      <span className="esti-staff-tile__dot" />
                      <span className="esti-label esti-label--secondary">
                        {EMPLOYMENT_TYPES[m.employmentType as EmploymentTypeCode] ??
                          m.employmentType}
                      </span>
                      <StatusDot
                        color={m.active ? "green" : "gray"}
                        label={m.active ? "Active" : "Inactive"}
                      />
                    </div>

                    <p className="esti-staff-tile__name">{m.name}</p>
                    <p className="esti-staff-tile__role">
                      {m.jobTitle || (TEAM_ROLES[m.role as TeamRoleCode] ?? m.role)}
                    </p>
                    {levelLabel && (
                      <span className="esti-staff-tile__level-badge">
                        {m.staffLevel}
                      </span>
                    )}
                    {contact && (
                      <p className="esti-label esti-label--secondary">{contact}</p>
                    )}
                    <p className="esti-label esti-label--secondary">
                      {formatINR(m.monthlySalaryPaise, { paise: false })} / mo
                    </p>

                    <div className="esti-staff-tile__actions">
                      <Button
                        variant="text"
                        size="small"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: m.id, active: !m.active })
                        }
                      >
                        {m.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </DataState>

      <TeamsPanel />
      </RailLayout>

      {/* Add member modal */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New team member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="tm-name"
              label="Name"
              value={form.name}
              onChange={set("name")}
            />
            <TextField
              id="tm-role"
              select
              label="Role"
              value={form.role}
              onChange={set("role")}
            >
              {(Object.keys(TEAM_ROLES) as TeamRoleCode[]).map((k) => (
                <MenuItem key={k} value={k}>{TEAM_ROLES[k]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="tm-emp"
              select
              label="Employment type"
              value={form.employmentType}
              onChange={set("employmentType")}
            >
              {(Object.keys(EMPLOYMENT_TYPES) as EmploymentTypeCode[]).map((k) => (
                <MenuItem key={k} value={k}>{EMPLOYMENT_TYPES[k]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="tm-salary"
              label="Monthly salary (₹)"
              type="number"
              value={form.salary}
              onChange={set("salary")}
            />
            <TextField
              id="tm-joined"
              label="Date joined (optional)"
              type="date"
              value={form.dateJoined}
              onChange={set("dateJoined")}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="tm-email"
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
            <TextField
              id="tm-phone"
              label="Phone (optional)"
              value={form.phone}
              onChange={set("phone")}
            />
            {create.error && (
              <Alert severity="error">{create.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.name || create.isPending}
            onClick={() =>
              create.mutate({
                name: form.name,
                role: form.role,
                employmentType: form.employmentType,
                email: form.email || undefined,
                phone: form.phone || undefined,
                monthlySalaryPaise: form.salary ? parseRupeeInput(form.salary) : 0,
                dateJoined: form.dateJoined || null,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
