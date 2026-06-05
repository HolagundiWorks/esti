-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_estimation ADD INDEX idx_esti_estimation_entity (entity);
ALTER TABLE llx_esti_estimation ADD INDEX idx_esti_estimation_status (status);
ALTER TABLE llx_esti_estimation ADD INDEX idx_esti_estimation_project (fk_project);
ALTER TABLE llx_esti_estimation ADD INDEX idx_esti_estimation_client (fk_client);
ALTER TABLE llx_esti_estimation ADD INDEX idx_esti_estimation_parent (fk_parent);
