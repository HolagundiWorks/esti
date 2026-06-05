-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_boq_line(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	fk_boq INTEGER NOT NULL,
	sort_order INTEGER DEFAULT 0 NOT NULL,
	line_type VARCHAR(16) DEFAULT 'ITEM' NOT NULL,
	section_title VARCHAR(255),
	item_no VARCHAR(64),
	item_code VARCHAR(128),
	description VARCHAR(512) NOT NULL,
	unit VARCHAR(64),
	original_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	variation_qty DECIMAL(24,8) DEFAULT 0 NOT NULL,
	quantity DECIMAL(24,8) DEFAULT 0 NOT NULL,
	rate DECIMAL(24,8) DEFAULT 0 NOT NULL,
	amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	gst_rate DECIMAL(8,4) DEFAULT 0 NOT NULL,
	gst_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	variation_reason VARCHAR(255),
	fk_dsritem INTEGER,
	fk_rateanalysis INTEGER,
	fk_estimation_line INTEGER,
	note VARCHAR(255),
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER
) ENGINE=innodb;
