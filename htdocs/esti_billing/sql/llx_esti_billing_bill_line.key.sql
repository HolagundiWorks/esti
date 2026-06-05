-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_billing_bill_line ADD INDEX idx_esti_billing_line_entity (entity);
ALTER TABLE llx_esti_billing_bill_line ADD INDEX idx_esti_billing_line_bill (fk_bill);
ALTER TABLE llx_esti_billing_bill_line ADD INDEX idx_esti_billing_line_boqline (fk_boq_line);
ALTER TABLE llx_esti_billing_bill_line ADD CONSTRAINT fk_esti_billing_line_bill FOREIGN KEY (fk_bill) REFERENCES llx_esti_billing_bill(rowid);
