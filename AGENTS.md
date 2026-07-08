# ESTI — agent instructions

**Canonical agent guide:** [CLAUDE.md](CLAUDE.md)

**UI:** `@hcw/ui-kit` (HCW-UI-Kit) everywhere except the landing page, which stays
Pure Carbon — see [`docs/esti/HCW-UI-KIT.md`](docs/esti/HCW-UI-KIT.md) and
[`docs/esti/CARBON-UI-DIRECTION.md`](docs/esti/CARBON-UI-DIRECTION.md); enforced by
`frontend/scripts/check-carbon.mjs` + `carbon-policy.test.ts`.

**AORMS AI:** `@hcw/aorms-ai-kit` — prompts + Ollama SDK in backend.

Do not duplicate content here; edit `CLAUDE.md` only.
