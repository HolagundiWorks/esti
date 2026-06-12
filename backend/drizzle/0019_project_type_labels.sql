-- Rename legacy ALL_CAPS project_type values to human-readable labels.
-- The column is plain text (no CHECK constraint), so plain UPDATEs suffice.
UPDATE esti_projectoffice SET project_type = 'Residential Architecture'             WHERE project_type = 'RESIDENTIAL';
UPDATE esti_projectoffice SET project_type = 'Commercial Architecture'              WHERE project_type = 'COMMERCIAL';
UPDATE esti_projectoffice SET project_type = 'Institutional Architecture'           WHERE project_type = 'INSTITUTIONAL';
UPDATE esti_projectoffice SET project_type = 'Landscape Architecture'               WHERE project_type = 'SITE_LANDSCAPE';
UPDATE esti_projectoffice SET project_type = 'Interior Architecture'                WHERE project_type = 'INTERIORS';
