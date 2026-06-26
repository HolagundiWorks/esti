-- Construction Cost OS 3.17 — Goods Receipt Note (GRN)
-- Records physical material deliveries to site against a work package.

CREATE TABLE esti_grn (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  work_package_id   uuid        REFERENCES esti_work_package(id) ON DELETE SET NULL,
  delivery_date     date        NOT NULL,
  vendor_name       text        NOT NULL,
  delivery_note_ref text,
  status            text        NOT NULL DEFAULT 'DRAFT',
  notes             text,
  verified_by_id    uuid        REFERENCES esti_user(id) ON DELETE SET NULL,
  verified_at       timestamptz,
  created_by_id     uuid        REFERENCES esti_user(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE esti_grn_item (
  id                    uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id                uuid           NOT NULL REFERENCES esti_grn(id) ON DELETE CASCADE,
  work_package_item_id  uuid           REFERENCES esti_work_package_item(id) ON DELETE SET NULL,
  description           text           NOT NULL,
  unit                  text           NOT NULL,
  qty_received          numeric(12,4)  NOT NULL,
  unit_rate_paise       bigint,
  created_at            timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX esti_grn_project_idx ON esti_grn(project_id);
CREATE INDEX esti_grn_item_grn_idx ON esti_grn_item(grn_id);
CREATE INDEX esti_grn_item_wpi_idx ON esti_grn_item(work_package_item_id);
