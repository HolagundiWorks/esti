-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_estimation(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	ref VARCHAR(128) NOT NULL,
	title VARCHAR(255) NOT NULL,
	status INTEGER DEFAULT 0 NOT NULL,
	fk_project INTEGER NOT NULL,
	fk_client INTEGER,
	fk_workpackage INTEGER,
	revision_no INTEGER DEFAULT 0 NOT NULL,
	fk_parent INTEGER,
	scope TEXT,
	date_estimate DATE,
	date_valid DATE,
	total_amount DECIMAL(24,8) DEFAULT 0 NOT NULL,
	total_gst DECIMAL(24,8) DEFAULT 0 NOT NULL,
	total_labour_cess DECIMAL(24,8) DEFAULT 0 NOT NULL,
	grand_total DECIMAL(24,8) DEFAULT 0 NOT NULL,
	note_public TEXT,
	note_private TEXT,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	fk_user_modif INTEGER,
	fk_user_approved INTEGER,
	date_approved DATETIME,
	import_key VARCHAR(14),
	UNIQUE uk_esti_estimation_ref (entity, ref)
) ENGINE=innodb;
