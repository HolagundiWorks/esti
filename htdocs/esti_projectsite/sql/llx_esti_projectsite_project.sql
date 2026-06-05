-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_projectsite_project(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	ref VARCHAR(128) NOT NULL,
	title VARCHAR(255) NOT NULL,
	project_type VARCHAR(32) DEFAULT 'BUILDING' NOT NULL,
	status INTEGER DEFAULT 0 NOT NULL,
	state_code VARCHAR(10),
	district VARCHAR(128),
	city VARCHAR(128),
	pin VARCHAR(10),
	address TEXT,
	gps_lat DECIMAL(10,7),
	gps_lng DECIMAL(10,7),
	fk_client INTEGER,
	fk_consultant INTEGER,
	fk_architect INTEGER,
	contract_value DECIMAL(24,8) DEFAULT 0,
	date_start DATE,
	date_end_planned DATE,
	date_end_actual DATE,
	note_public TEXT,
	note_private TEXT,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	import_key VARCHAR(14),
	UNIQUE uk_esti_projectsite_project_ref (entity, ref)
) ENGINE=innodb;
