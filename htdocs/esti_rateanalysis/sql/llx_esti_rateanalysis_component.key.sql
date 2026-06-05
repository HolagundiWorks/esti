-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_rateanalysis_component ADD INDEX idx_esti_ra_comp_entity (entity);
ALTER TABLE llx_esti_rateanalysis_component ADD INDEX idx_esti_ra_comp_ra (fk_rateanalysis);
ALTER TABLE llx_esti_rateanalysis_component ADD INDEX idx_esti_ra_comp_type (component_type);
ALTER TABLE llx_esti_rateanalysis_component ADD CONSTRAINT fk_esti_ra_comp_ra FOREIGN KEY (fk_rateanalysis) REFERENCES llx_esti_rateanalysis(rowid);
