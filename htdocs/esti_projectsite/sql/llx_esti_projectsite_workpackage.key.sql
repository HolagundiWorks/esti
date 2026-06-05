-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_projectsite_workpackage ADD INDEX idx_esti_projectsite_workpackage_entity (entity);
ALTER TABLE llx_esti_projectsite_workpackage ADD INDEX idx_esti_projectsite_workpackage_project (fk_project);
ALTER TABLE llx_esti_projectsite_workpackage ADD INDEX idx_esti_projectsite_workpackage_status (status);
ALTER TABLE llx_esti_projectsite_workpackage ADD CONSTRAINT fk_esti_workpackage_project FOREIGN KEY (fk_project) REFERENCES llx_esti_projectsite_project(rowid);
