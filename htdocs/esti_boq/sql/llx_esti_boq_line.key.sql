-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_boq_line ADD INDEX idx_esti_boq_line_entity (entity);
ALTER TABLE llx_esti_boq_line ADD INDEX idx_esti_boq_line_boq (fk_boq);
ALTER TABLE llx_esti_boq_line ADD INDEX idx_esti_boq_line_dsritem (fk_dsritem);
ALTER TABLE llx_esti_boq_line ADD INDEX idx_esti_boq_line_ra (fk_rateanalysis);
ALTER TABLE llx_esti_boq_line ADD CONSTRAINT fk_esti_boq_line_boq FOREIGN KEY (fk_boq) REFERENCES llx_esti_boq(rowid);
