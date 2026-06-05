-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

-- Deductions applied to a bill: TDS, retention, advance recovery,
-- royalty, security deposit, other contractual deductions.
-- amount is positive (deducted from gross payable).
-- is_percentage: if 1, amount = base_value × pct / 100 (computed before save).

CREATE TABLE llx_esti_billing_deduction(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	fk_bill INTEGER NOT NULL,
	sort_order INTEGER DEFAULT 0 NOT NULL,
	deduction_type VARCHAR(32) NOT NULL,
	description VARCHAR(255) NOT NULL,
	is_percentage TINYINT DEFAULT 0 NOT NULL,
	pct DECIMAL(8,4) DEFAULT 0 NOT NULL,
	base_value DECIMAL(24,8) DEFAULT 0 NOT NULL,
	amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	note VARCHAR(255),
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER
) ENGINE=innodb;
