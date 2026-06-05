-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_dsrsor_item(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	fk_master INTEGER NOT NULL,
	fk_version INTEGER NOT NULL,
	ref VARCHAR(128) NOT NULL,
	department VARCHAR(128) NOT NULL,
	authority VARCHAR(128),
	schedule_type VARCHAR(32) NOT NULL,
	year INTEGER NOT NULL,
	chapter VARCHAR(128),
	item_code VARCHAR(128) NOT NULL,
	description TEXT NOT NULL,
	unit VARCHAR(32) NOT NULL,
	base_rate DOUBLE(24,8) DEFAULT 0 NOT NULL,
	lead_included DOUBLE(24,8) DEFAULT 0,
	lift_included DOUBLE(24,8) DEFAULT 0,
	gst_inclusion VARCHAR(32),
	effective_date DATE,
	specification_reference VARCHAR(255),
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	status INTEGER DEFAULT 0 NOT NULL,
	import_key VARCHAR(14),
	UNIQUE uk_esti_dsrsor_item_code_version (entity, fk_version, item_code)
) ENGINE=innodb;
