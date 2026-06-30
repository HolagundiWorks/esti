-- CMS-6: Contractor Bills + Certification
-- Bill header ties to a work order (rate source).
-- Bill lines carry element + wo_item (rate locked) + claimed/certified qty.
-- Certification: architect sets certified_qty ≤ site-measured cumulative; arithmetic check only.

CREATE TABLE esti_cms_bill (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES esti_projectoffice(id) ON DELETE CASCADE,
  work_order_id           uuid NOT NULL REFERENCES esti_cms_work_order(id) ON DELETE RESTRICT,
  contractor_id           uuid NOT NULL REFERENCES esti_contractor(id) ON DELETE RESTRICT,
  bill_no                 text NOT NULL,
  period_from             text NOT NULL,
  period_to               text NOT NULL,
  status                  text NOT NULL DEFAULT 'DRAFT',
  claimed_amount_paise    integer NOT NULL DEFAULT 0,
  certified_amount_paise  integer NOT NULL DEFAULT 0,
  remarks                 text,
  certified_by_id         uuid REFERENCES esti_user(id) ON DELETE SET NULL,
  certified_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE esti_cms_bill_line (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id                 uuid NOT NULL REFERENCES esti_cms_bill(id) ON DELETE CASCADE,
  element_id              uuid NOT NULL REFERENCES esti_cms_element(id) ON DELETE RESTRICT,
  wo_item_id              uuid NOT NULL REFERENCES esti_cms_wo_item(id) ON DELETE RESTRICT,
  claimed_qty             double precision NOT NULL DEFAULT 0,
  rate_paise              integer NOT NULL DEFAULT 0,
  claimed_amount_paise    integer NOT NULL DEFAULT 0,
  certified_qty           double precision,
  certified_amount_paise  integer,
  hold_reason             text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON esti_cms_bill (project_id);
CREATE INDEX ON esti_cms_bill (work_order_id);
CREATE INDEX ON esti_cms_bill_line (bill_id);
CREATE INDEX ON esti_cms_bill_line (element_id);
