-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

-- One line per BOQ work item in the bill.
-- prev_qty = cumulative qty certified up to the previous bill.
-- current_qty = qty measured/certified in this bill period.
-- cumulative_qty = prev_qty + current_qty.
-- certified_qty <= cumulative_qty (engineer may certify less).
-- amount = certified_qty × rate.

CREATE TABLE llx_esti_billing_bill_line(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	fk_bill INTEGER NOT NULL,
	sort_order INTEGER DEFAULT 0 NOT NULL,
	line_type VARCHAR(16) DEFAULT 'ITEM' NOT NULL,
	section_title VARCHAR(255),
	item_no VARCHAR(64),
	item_code VARCHAR(128),
	description VARCHAR(512) NOT NULL,
	unit VARCHAR(64),
	boq_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	prev_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	current_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	cumulative_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	certified_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	rate DECIMAL(24,8) DEFAULT 0 NOT NULL,
	amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	fk_boq_line INTEGER,
	note VARCHAR(255),
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER
) ENGINE=innodb;
