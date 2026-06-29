import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  Search,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import {
  EMPLOYMENT_TYPES,
  type EmploymentTypeCode,
  TEAM_ROLES,
  type TeamRoleCode,
  formatINR,
  parseRupeeInput,
} from "@esti/contracts";
import { type CSSProperties, useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { TeamsPanel } from "../components/TeamsPanel.js";
import { getInitials, resolveColor } from "../components/StaffAvatar.js";
import { STAFF_LEVEL_LABEL, STAFF_LEVEL_COLOR } from "@esti/contracts";
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
    <Stack gap={6}>
      {!embedded && (
        <PageHeader
          title="Team"
          description="Office team members, roles, employment type and monthly salary."
        />
      )}

      {/* Toolbar */}
      <div className="esti-team-bar">
        <Search
          id="team-search"
          labelText="Search team"
          placeholder="Search team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setOpen(true)}>New member</Button>
      </div>

      {/* Portrait tile grid */}
      {list.isLoading ? (
        <p className="esti-label esti-label--secondary">Loading…</p>
      ) : members.length === 0 ? (
        <Tile>
          <Stack gap={3}>
            <p>
              {search
                ? `No staff match "${search}".`
                : "No team members yet. Add staff to enable HR, payroll and project team tracking."}
            </p>
            {!search && (
              <Button size="sm" onClick={() => setOpen(true)}>
                New member
              </Button>
            )}
          </Stack>
        </Tile>
      ) : (
        <Grid narrow>
          {members.map((m) => {
            const color = resolveColor({ staffLevel: m.staffLevel ?? null, name: m.name });
            const initials = getInitials(m.name);
            const levelKey = m.staffLevel as keyof typeof STAFF_LEVEL_LABEL | undefined;
            const levelLabel = levelKey ? STAFF_LEVEL_LABEL[levelKey] : null;
            const contact = m.email ?? m.phone ?? null;
            return (
              <Column key={m.id} lg={3} md={2} sm={2}>
                <Tile className="esti-staff-tile" style={{ "--esti-staff-color": color } as CSSProperties}>
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
                      <Tag type={m.active ? "green" : "gray"} size="sm">
                        {m.active ? "Active" : "Inactive"}
                      </Tag>
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
                        kind="ghost"
                        size="sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: m.id, active: !m.active })
                        }
                      >
                        {m.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </Tile>
              </Column>
            );
          })}
        </Grid>
      )}

      <TeamsPanel />

      {/* Add member modal */}
      <Modal
        open={open}
        modalHeading="New team member"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.name || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
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
        <Stack gap={5}>
          <TextInput
            id="tm-name"
            labelText="Name"
            value={form.name}
            onChange={set("name")}
          />
          <Select
            id="tm-role"
            labelText="Role"
            value={form.role}
            onChange={set("role")}
          >
            {(Object.keys(TEAM_ROLES) as TeamRoleCode[]).map((k) => (
              <SelectItem key={k} value={k} text={TEAM_ROLES[k]} />
            ))}
          </Select>
          <Select
            id="tm-emp"
            labelText="Employment type"
            value={form.employmentType}
            onChange={set("employmentType")}
          >
            {(Object.keys(EMPLOYMENT_TYPES) as EmploymentTypeCode[]).map(
              (k) => (
                <SelectItem key={k} value={k} text={EMPLOYMENT_TYPES[k]} />
              ),
            )}
          </Select>
          <TextInput
            id="tm-salary"
            labelText="Monthly salary (₹)"
            type="number"
            value={form.salary}
            onChange={set("salary")}
          />
          <TextInput
            id="tm-joined"
            labelText="Date joined (optional)"
            type="date"
            value={form.dateJoined}
            onChange={set("dateJoined")}
          />
          <TextInput
            id="tm-email"
            labelText="Email (optional)"
            type="email"
            value={form.email}
            onChange={set("email")}
          />
          <TextInput
            id="tm-phone"
            labelText="Phone (optional)"
            value={form.phone}
            onChange={set("phone")}
          />
          {create.error && (
            <InlineNotification
              kind="error"
              title="Could not create"
              subtitle={create.error.message}
              hideCloseButton
              lowContrast
            />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
