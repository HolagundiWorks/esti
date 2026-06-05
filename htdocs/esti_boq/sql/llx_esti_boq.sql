-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_boq(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	ref VARCHAR(128) NOT NULL,
	title VARCHAR(255) NOT NULL,
	boq_type VARCHAR(16) DEFAULT 'INTERNAL' NOT NULL,
	status INTEGER DEFAULT 0 NOT NULL,
	fk_project INTEGER NOT NULL,
	fk_workpackage INTEGER,
	fk_estimation INTEGER,
	revision_no INTEGER DEFAULT 0 NOT NULL,
	fk_parent INTEGER,
	date_boq DATE,
	total_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	total_gst DECIMAL(24,8) DEFAULT 0 NOT NULL,
	grand_total DECIMAL(24,8) DEFAULT 0 NOT NULL,
	note_public TEXT,
	note_private TEXT,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	fk_user_locked INTEGER,
	date_locked DATETIME,
	import_key VARCHAR(14),
	UNIQUE uk_esti_boq_ref (entity, ref)
) ENGINE=innodb;
