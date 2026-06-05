-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_estimation_line ADD INDEX idx_esti_estimation_line_entity (entity);
ALTER TABLE llx_esti_estimation_line ADD INDEX idx_esti_estimation_line_est (fk_estimation);
ALTER TABLE llx_esti_estimation_line ADD INDEX idx_esti_estimation_line_ra (fk_rateanalysis);
ALTER TABLE llx_esti_estimation_line ADD CONSTRAINT fk_esti_est_line_est FOREIGN KEY (fk_estimation) REFERENCES llx_esti_estimation(rowid);
