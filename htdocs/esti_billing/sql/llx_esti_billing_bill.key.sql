-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_billing_bill ADD INDEX idx_esti_billing_bill_entity (entity);
ALTER TABLE llx_esti_billing_bill ADD INDEX idx_esti_billing_bill_status (status);
ALTER TABLE llx_esti_billing_bill ADD INDEX idx_esti_billing_bill_project (fk_project);
ALTER TABLE llx_esti_billing_bill ADD INDEX idx_esti_billing_bill_boq (fk_boq);
ALTER TABLE llx_esti_billing_bill ADD INDEX idx_esti_billing_bill_client (fk_client);
