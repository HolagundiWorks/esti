-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_boq ADD INDEX idx_esti_boq_entity (entity);
ALTER TABLE llx_esti_boq ADD INDEX idx_esti_boq_status (status);
ALTER TABLE llx_esti_boq ADD INDEX idx_esti_boq_project (fk_project);
ALTER TABLE llx_esti_boq ADD INDEX idx_esti_boq_workpackage (fk_workpackage);
ALTER TABLE llx_esti_boq ADD INDEX idx_esti_boq_estimation (fk_estimation);
ALTER TABLE llx_esti_boq ADD INDEX idx_esti_boq_parent (fk_parent);
