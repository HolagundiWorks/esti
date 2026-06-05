-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

-- RA Bill / Final Bill / Supplementary Bill header.
-- bill_no is the sequential running account number for a given project/BOQ.
-- gross_value = sum of certified work (qty × rate) across all lines.
-- net_payable = gross_value + gst_amount + labour_cess
--             - total_deductions (TDS + retention + advance_recovery + other).

CREATE TABLE llx_esti_billing_bill(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	ref VARCHAR(128) NOT NULL,
	bill_type VARCHAR(16) DEFAULT 'RA' NOT NULL,
	bill_no INTEGER DEFAULT 1 NOT NULL,
	status INTEGER DEFAULT 0 NOT NULL,
	fk_project INTEGER NOT NULL,
	fk_boq INTEGER,
	fk_workpackage INTEGER,
	fk_client INTEGER,
	bill_period_start DATE,
	bill_period_end DATE,
	date_bill DATE,
	date_submitted DATE,
	date_certified DATE,
	gross_value DECIMAL(24,8) DEFAULT 0 NOT NULL,
	gst_rate DECIMAL(8,4) DEFAULT 0 NOT NULL,
	gst_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	labour_cess_pct DECIMAL(8,4) DEFAULT 0 NOT NULL,
	labour_cess_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	total_deductions DECIMAL(24,8) DEFAULT 0 NOT NULL,
	net_payable DECIMAL(24,8) DEFAULT 0 NOT NULL,
	note_public TEXT,
	note_private TEXT,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	fk_user_certified INTEGER,
	import_key VARCHAR(14),
	UNIQUE uk_esti_billing_bill_ref (entity, ref)
) ENGINE=innodb;
