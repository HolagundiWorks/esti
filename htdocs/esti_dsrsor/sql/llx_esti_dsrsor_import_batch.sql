-- Copyright (C) 2026 ESTI contributors
--
-- This program is free software; you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation; either version 3 of the License, or
-- (at your option) any later version.

CREATE TABLE llx_esti_dsrsor_import_batch(
	rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
	entity INTEGER DEFAULT 1 NOT NULL,
	ref VARCHAR(128) NOT NULL,
	original_filename VARCHAR(255),
	stored_filename VARCHAR(255),
	schedule_type VARCHAR(32),
	department VARCHAR(128),
	authority VARCHAR(128),
	year INTEGER,
	total_rows INTEGER DEFAULT 0 NOT NULL,
	valid_rows INTEGER DEFAULT 0 NOT NULL,
	created_count INTEGER DEFAULT 0 NOT NULL,
	updated_count INTEGER DEFAULT 0 NOT NULL,
	skipped_count INTEGER DEFAULT 0 NOT NULL,
	error_count INTEGER DEFAULT 0 NOT NULL,
	error_summary TEXT,
	date_creation DATETIME NOT NULL,
	tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	fk_user_creat INTEGER NOT NULL,
	status INTEGER DEFAULT 0 NOT NULL,
	import_key VARCHAR(14),
	UNIQUE uk_esti_dsrsor_import_batch_ref (entity, ref)
) ENGINE=innodb;
