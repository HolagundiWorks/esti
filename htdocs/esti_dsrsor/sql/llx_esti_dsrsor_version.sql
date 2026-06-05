-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_dsrsor_version(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	fk_master INTEGER NOT NULL,
	ref VARCHAR(128) NOT NULL,
	year INTEGER NOT NULL,
	effective_date DATE,
	description TEXT,
	is_locked SMALLINT DEFAULT 0 NOT NULL,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	status INTEGER DEFAULT 0 NOT NULL,
	import_key VARCHAR(14),
	UNIQUE uk_esti_dsrsor_version_ref (entity, ref),
	UNIQUE uk_esti_dsrsor_version_master_year (entity, fk_master, year)
) ENGINE=innodb;
