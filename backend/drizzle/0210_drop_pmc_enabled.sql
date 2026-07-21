-- Remove the legacy PMC module toggle.
--
-- The PMC hub (construction coordination, CPM/Gantt, tenders, mood boards) was
-- torn down in the consultancy-only pivot (migration 0117). The site-supervision
-- registers that survived — snags, site instructions, progress reports, phase
-- progress — were still gated behind `pmc_enabled` via requirePmcEnabled /
-- assertProjectPmcEnabled. Those features are now always available, so the flag
-- and its firm/project toggles are removed.
ALTER TABLE esti_orgsettings DROP COLUMN IF EXISTS pmc_enabled;
ALTER TABLE esti_projectoffice DROP COLUMN IF EXISTS pmc_enabled;
