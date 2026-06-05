ALTER TABLE llx_esti_dsrsor_audit ADD INDEX idx_esti_dsrsor_audit_entity (entity);
ALTER TABLE llx_esti_dsrsor_audit ADD INDEX idx_esti_dsrsor_audit_item (fk_item);
ALTER TABLE llx_esti_dsrsor_audit ADD INDEX idx_esti_dsrsor_audit_batch (fk_import_batch);
ALTER TABLE llx_esti_dsrsor_audit ADD INDEX idx_esti_dsrsor_audit_action (action_code);
ALTER TABLE llx_esti_dsrsor_audit ADD INDEX idx_esti_dsrsor_audit_date (date_creation);
