ALTER TABLE llx_esti_dsrsor_version ADD INDEX idx_esti_dsrsor_version_entity (entity);
ALTER TABLE llx_esti_dsrsor_version ADD INDEX idx_esti_dsrsor_version_master (fk_master);
ALTER TABLE llx_esti_dsrsor_version ADD INDEX idx_esti_dsrsor_version_year (year);
ALTER TABLE llx_esti_dsrsor_version ADD INDEX idx_esti_dsrsor_version_effective (effective_date);
ALTER TABLE llx_esti_dsrsor_version ADD INDEX idx_esti_dsrsor_version_status (status);
