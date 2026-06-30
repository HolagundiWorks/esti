-- CMS-5: Work Orders
-- Contractor agreement per project; category-keyed line items carry agreed rates.
-- Bills reference wo_item for rate (rate locked at WO level).

CREATE TABLE esti_cms_work_order (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  contractor_id   uuid NOT NULL REFERENCES esti_contractor(id) ON DELETE RESTRICT,
  ref             text NOT NULL,
  date            text NOT NULL,
  scope           text,
  status          text NOT NULL DEFAULT 'DRAFT',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE esti_cms_wo_item (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id       uuid NOT NULL REFERENCES esti_cms_work_order(id) ON DELETE CASCADE,
  specification_id    uuid REFERENCES esti_kb_specification(id) ON DELETE SET NULL,
  description         text NOT NULL,
  unit                text NOT NULL,
  agreed_rate_paise   integer NOT NULL DEFAULT 0,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON esti_cms_work_order (project_id);
CREATE INDEX ON esti_cms_wo_item (work_order_id);
