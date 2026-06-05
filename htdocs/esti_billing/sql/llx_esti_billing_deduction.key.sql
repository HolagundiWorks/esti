-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

ALTER TABLE llx_esti_billing_deduction ADD INDEX idx_esti_billing_ded_entity (entity);
ALTER TABLE llx_esti_billing_deduction ADD INDEX idx_esti_billing_ded_bill (fk_bill);
ALTER TABLE llx_esti_billing_deduction ADD INDEX idx_esti_billing_ded_type (deduction_type);
ALTER TABLE llx_esti_billing_deduction ADD CONSTRAINT fk_esti_billing_ded_bill FOREIGN KEY (fk_bill) REFERENCES llx_esti_billing_bill(rowid);
