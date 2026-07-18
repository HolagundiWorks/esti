# Brand logo masters

Source PNG/AFF files for `frontend/scripts/sync-brand-assets.py`. The script
trims/processes masters and writes optimised assets to `frontend/public/`.

Expected filenames:

- `etsi black.png`, `etsi white colour.png`, `etsi wb.png`
- `aorms black.png`, `aorms white.png`
- `esticad logo.png`
- `hcw black.png`, `HCW white.png`

**Generated runtime assets** (via `sync-brand-assets.py`):

- `aorms-logo.png` — full wordmark mask
- `aorms-mark.png` — isolated lowercase **a** (favicon + square mark)
- Favicons / PWA icons — Radiant Orange tile with white **a**

**Runtime assets** ship from `frontend/public/` — this folder is for regeneration
only and is not referenced by the app at build time.

See also [AORMS-BRANDING-KIT.md](../AORMS-BRANDING-KIT.md).
