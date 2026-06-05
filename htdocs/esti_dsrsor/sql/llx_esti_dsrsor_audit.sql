-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_dsrsor_audit(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	object_type VARCHAR(64) NOT NULL,
	object_id INTEGER,
	fk_item INTEGER,
	fk_import_batch INTEGER,
	action_code VARCHAR(32) NOT NULL,
	field_name VARCHAR(128),
	old_value TEXT,
	new_value TEXT,
	reason VARCHAR(255),
	date_creation DATETIME NOT NULL,
	fk_user_creat INTEGER NOT NULL,
	import_key VARCHAR(14)
) ENGINE=innodb;
