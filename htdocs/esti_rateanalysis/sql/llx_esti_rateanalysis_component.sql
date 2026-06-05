-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_rateanalysis_component(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	fk_rateanalysis INTEGER NOT NULL,
	component_type VARCHAR(32) NOT NULL,
	sort_order INTEGER DEFAULT 0 NOT NULL,
	description VARCHAR(512) NOT NULL,
	spec_reference VARCHAR(255),
	unit VARCHAR(64),
	quantity DECIMAL(24,8) DEFAULT 0 NOT NULL,
	rate DECIMAL(24,8) DEFAULT 0 NOT NULL,
	amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	wastage_pct DECIMAL(8,4) DEFAULT 0 NOT NULL,
	lead_km DECIMAL(10,3) DEFAULT 0 NOT NULL,
	lift_m DECIMAL(10,3) DEFAULT 0 NOT NULL,
	is_gst_inclusive TINYINT DEFAULT 0 NOT NULL,
	gst_rate DECIMAL(8,4) DEFAULT 0 NOT NULL,
	note VARCHAR(255),
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER
) ENGINE=innodb;
