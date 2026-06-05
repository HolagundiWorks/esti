-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_rateanalysis(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	ref VARCHAR(128) NOT NULL,
	title VARCHAR(255) NOT NULL,
	unit VARCHAR(64) NOT NULL,
	status INTEGER DEFAULT 0 NOT NULL,
	fk_project INTEGER,
	fk_dsritem INTEGER,
	schedule_type VARCHAR(32),
	revision_no INTEGER DEFAULT 0 NOT NULL,
	fk_parent INTEGER,
	base_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	overhead_pct DECIMAL(8,4) DEFAULT 0 NOT NULL,
	overhead_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	contractor_profit_pct DECIMAL(8,4) DEFAULT 0 NOT NULL,
	contractor_profit_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	gst_rate DECIMAL(8,4) DEFAULT 0 NOT NULL,
	gst_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	labour_cess_pct DECIMAL(8,4) DEFAULT 0 NOT NULL,
	labour_cess_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	total_rate DECIMAL(24,8) DEFAULT 0 NOT NULL,
	note_public TEXT,
	note_private TEXT,
	date_effective DATE,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	fk_user_approved INTEGER,
	date_approved DATETIME,
	import_key VARCHAR(14),
	UNIQUE uk_esti_rateanalysis_ref (entity, ref)
) ENGINE=innodb;
