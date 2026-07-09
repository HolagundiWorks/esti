import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ACCOUNT_DISCIPLINE_LABEL,
  ACCOUNT_TEAM_SIZE_LABEL,
  NAME_PREFIX_PRESETS,
  type AccountDiscipline,
  type AccountSignupProfile,
  type AccountTeamSize,
  INDIAN_STATES,
  type PracticeKind,
} from "@esti/contracts";

export type ProfileDraft = AccountSignupProfile;

export const EMPTY_PROFILE: ProfileDraft = {
  namePrefix: "",
  fullName: "",
  mobile: "",
  firmName: "",
  accountKind: "FIRM",
  teamSize: "2_5",
  discipline: "ARCHITECTURE",
  city: "",
  state: "Karnataka",
  coaRegistrationNo: "",
  gstin: "",
  website: "",
};

type Props = {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
};

export function AccountSignupFields({ value, onChange }: Props) {
  function set<K extends keyof ProfileDraft>(key: K, v: ProfileDraft[K]) {
    onChange({ ...value, [key]: v });
  }

  function setAccountKind(kind: PracticeKind) {
    onChange({
      ...value,
      accountKind: kind,
      teamSize: kind === "FREELANCER" ? "SOLO" : value.teamSize === "SOLO" ? "2_5" : value.teamSize,
    });
  }

  const presetValues = NAME_PREFIX_PRESETS.map((p) => p.value);
  const prefixPreset = presetValues.includes(value.namePrefix ?? "")
    ? (value.namePrefix ?? "")
    : value.namePrefix
      ? "__custom__"
      : "";

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" component="h3">
        Practice details
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="name-prefix-label">Name prefix</InputLabel>
        <Select
          labelId="name-prefix-label"
          label="Name prefix"
          value={prefixPreset}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              set("namePrefix", value.namePrefix && !presetValues.includes(value.namePrefix) ? value.namePrefix : "");
            } else {
              set("namePrefix", v || undefined);
            }
          }}
        >
          {NAME_PREFIX_PRESETS.map((p) => (
            <MenuItem key={p.label} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
          <MenuItem value="__custom__">Custom…</MenuItem>
        </Select>
      </FormControl>
      {prefixPreset === "__custom__" && (
        <TextField
          label="Custom prefix"
          placeholder="Ar."
          helperText="Letters only — include the full stop if you use one."
          value={value.namePrefix ?? ""}
          onChange={(e) => set("namePrefix", e.target.value)}
          fullWidth
        />
      )}
      {prefixPreset === "" && !value.namePrefix && (
        <Typography variant="caption" color="text.secondary">
          When COA registration is on file, greetings use Ar. automatically unless you choose a prefix here.
        </Typography>
      )}
      <TextField
        label="Full name"
        autoComplete="name"
        required
        value={value.fullName}
        onChange={(e) => set("fullName", e.target.value)}
        fullWidth
      />
      <TextField
        label="Mobile"
        autoComplete="tel"
        placeholder="+91 98765 43210"
        required
        value={value.mobile}
        onChange={(e) => set("mobile", e.target.value)}
        fullWidth
      />
      <TextField
        label="Firm / practice name"
        required
        value={value.firmName}
        onChange={(e) => set("firmName", e.target.value)}
        fullWidth
      />
      <FormControl fullWidth required>
        <InputLabel id="account-kind-label">Account type</InputLabel>
        <Select
          labelId="account-kind-label"
          label="Account type"
          value={value.accountKind}
          onChange={(e) => setAccountKind(e.target.value as PracticeKind)}
        >
          <MenuItem value="FIRM">Architecture firm / studio</MenuItem>
          <MenuItem value="FREELANCER">Freelancer / solo practitioner</MenuItem>
        </Select>
      </FormControl>
      {value.accountKind === "FIRM" && (
        <FormControl fullWidth required>
          <InputLabel id="team-size-label">Team size</InputLabel>
          <Select
            labelId="team-size-label"
            label="Team size"
            value={value.teamSize}
            onChange={(e) => set("teamSize", e.target.value as AccountTeamSize)}
          >
            {(Object.keys(ACCOUNT_TEAM_SIZE_LABEL) as AccountTeamSize[])
              .filter((k) => k !== "SOLO")
              .map((k) => (
                <MenuItem key={k} value={k}>
                  {ACCOUNT_TEAM_SIZE_LABEL[k]}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}
      <FormControl fullWidth required>
        <InputLabel id="discipline-label">Primary discipline</InputLabel>
        <Select
          labelId="discipline-label"
          label="Primary discipline"
          value={value.discipline}
          onChange={(e) => set("discipline", e.target.value as AccountDiscipline)}
        >
          {(Object.keys(ACCOUNT_DISCIPLINE_LABEL) as AccountDiscipline[]).map((k) => (
            <MenuItem key={k} value={k}>
              {ACCOUNT_DISCIPLINE_LABEL[k]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="City"
          required
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          fullWidth
        />
        <FormControl fullWidth required>
          <InputLabel id="state-label">State</InputLabel>
          <Select
            labelId="state-label"
            label="State"
            value={value.state}
            onChange={(e) => set("state", e.target.value as ProfileDraft["state"])}
          >
            {INDIAN_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Typography variant="subtitle2" component="h3">
        Optional registrations
      </Typography>
      <TextField
        label="COA registration no."
        value={value.coaRegistrationNo ?? ""}
        onChange={(e) => set("coaRegistrationNo", e.target.value)}
        fullWidth
      />
      <TextField
        label="GSTIN"
        value={value.gstin ?? ""}
        onChange={(e) => set("gstin", e.target.value)}
        fullWidth
      />
      <TextField
        label="Website"
        placeholder="https://yourfirm.in"
        value={value.website ?? ""}
        onChange={(e) => set("website", e.target.value)}
        fullWidth
      />
    </Stack>
  );
}
