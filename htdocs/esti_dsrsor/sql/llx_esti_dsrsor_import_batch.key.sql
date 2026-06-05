ALTER TABLE llx_esti_dsrsor_import_batch ADD INDEX idx_esti_dsrsor_import_batch_entity (entity);
ALTER TABLE llx_esti_dsrsor_import_batch ADD INDEX idx_esti_dsrsor_import_batch_ref (ref);
ALTER TABLE llx_esti_dsrsor_import_batch ADD INDEX idx_esti_dsrsor_import_batch_user (fk_user_creat);
ALTER TABLE llx_esti_dsrsor_import_batch ADD INDEX idx_esti_dsrsor_import_batch_date (date_creation);
ALTER TABLE llx_esti_dsrsor_import_batch ADD INDEX idx_esti_dsrsor_import_batch_status (status);
