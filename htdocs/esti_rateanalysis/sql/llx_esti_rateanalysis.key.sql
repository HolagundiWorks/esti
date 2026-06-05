-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_rateanalysis ADD INDEX idx_esti_rateanalysis_entity (entity);
ALTER TABLE llx_esti_rateanalysis ADD INDEX idx_esti_rateanalysis_status (status);
ALTER TABLE llx_esti_rateanalysis ADD INDEX idx_esti_rateanalysis_project (fk_project);
ALTER TABLE llx_esti_rateanalysis ADD INDEX idx_esti_rateanalysis_dsritem (fk_dsritem);
ALTER TABLE llx_esti_rateanalysis ADD INDEX idx_esti_rateanalysis_parent (fk_parent);
