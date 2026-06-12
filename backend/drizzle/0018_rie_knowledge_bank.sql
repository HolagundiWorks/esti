-- RIE: Versioned knowledge bank for jurisdiction-specific rule sets.
CREATE TABLE IF NOT EXISTS "esti_rule_version" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "state"          text NOT NULL,
  "district"       text NOT NULL,
  "authority"      text NOT NULL,
  "building_use"   text NOT NULL,
  "effective_date" date NOT NULL,
  "status"         text NOT NULL DEFAULT 'DRAFT',
  "source_citation" text,
  "data"           jsonb NOT NULL DEFAULT '{}',
  "notes"          text,
  "created_by_id"  uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "reviewed_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "published_at"   timestamp with time zone,
  "superseded_by_id" uuid REFERENCES "esti_rule_version"("id") ON DELETE SET NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- RIE: Per-project site assessment (all five engine outputs in jsonb).
CREATE TABLE IF NOT EXISTS "esti_site_assessment" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"       uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "rule_version_id"  uuid REFERENCES "esti_rule_version"("id") ON DELETE SET NULL,
  "status"           text NOT NULL DEFAULT 'DRAFT',
  "site_inputs"      jsonb NOT NULL DEFAULT '{}',
  "dev_control"      jsonb,
  "basement"         jsonb,
  "sustainability"   jsonb,
  "approval_readiness" jsonb,
  "overall_score"    integer,
  "issued_at"        timestamp with time zone,
  "pdf_key"          text,
  "created_by_id"    uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Seed: BBMP Bangalore rule version (2015 BDA/BBMP byelaws; seed values only).
INSERT INTO "esti_rule_version"
  ("state","district","authority","building_use","effective_date","status","source_citation","data","notes")
VALUES (
  'Karnataka','Bengaluru Urban','BBMP','RESIDENTIAL','2015-01-01','PUBLISHED',
  'BBMP Building Byelaws 2003 (amended 2015), BDA RMP-2015, BBMP-CGMP-2040 (draft)',
  '{
    "far": [
      {"maxRoadWidthM":12,"far":1.75,"coveragePct":60,"clause":"BBMP §6.1"},
      {"maxRoadWidthM":18,"far":2.25,"coveragePct":60,"clause":"BBMP §6.2"},
      {"maxRoadWidthM":24,"far":2.50,"coveragePct":60,"clause":"BBMP §6.3"},
      {"maxRoadWidthM":30,"far":3.00,"coveragePct":60,"clause":"BBMP §6.4"},
      {"maxRoadWidthM":9999,"far":3.25,"coveragePct":60,"clause":"BBMP §6.5"}
    ],
    "setbacks": [
      {"maxHeightM":11.5,"frontM":3.0,"rearM":1.5,"sideM":1.5,"clause":"BBMP §7.1"},
      {"maxHeightM":15,"frontM":5.0,"rearM":3.0,"sideM":3.0,"clause":"BBMP §7.2"},
      {"maxHeightM":18,"frontM":6.0,"rearM":3.0,"sideM":3.0,"clause":"BBMP §7.3"},
      {"maxHeightM":24,"frontM":7.0,"rearM":5.0,"sideM":5.0,"clause":"BBMP §7.4"},
      {"maxHeightM":9999,"frontM":10.0,"rearM":7.0,"sideM":7.0,"clause":"BBMP §7.5"}
    ],
    "heightLimits":{"absoluteMaxM":45,"floorHeightM":3.0,"clause":"BBMP §8.1"},
    "parking":{
      "car":{"sqmPerECS":100,"basis":"built_up","clause":"BBMP §15.2"},
      "twoWheeler":{"ratioOfCar":0.5,"clause":"BBMP §15.3"},
      "cycle":{"sqmPerSlot":200,"clause":"BBMP §15.4"}
    },
    "basement":{
      "maxDepthM":4.5,
      "ventilationOpeningPct":2.5,
      "permittedUses":["PARKING","UTILITIES","STORAGE"],
      "clause":"BBMP §20"
    },
    "sustainability":{
      "rainwaterHarvesting":{"minPitVolumeLtrPerSqm":0.5,"clause":"BBMP §30.1"},
      "solarPanels":{"minSqmPer100SqmBuiltUp":0,"clause":""},
      "evCharging":{"minPctParking":20,"clause":"BBMP §31.2"},
      "greenCover":{"minPctSiteArea":10,"clause":"BBMP §32.1"}
    },
    "approvalDocs":[
      {"id":"ownership","label":"Title deed / ownership document","required":true},
      {"id":"topo_survey","label":"Topographic survey plan","required":true},
      {"id":"site_plan","label":"Site plan (scale 1:500 or better)","required":true},
      {"id":"building_plan","label":"Building plan (floor plans, elevations, sections)","required":true},
      {"id":"structural_cert","label":"Structural stability certificate","required":true},
      {"id":"fire_noc","label":"Fire NOC (buildings >15 m height)","required":false},
      {"id":"khata","label":"Khata extract (A or B)","required":true},
      {"id":"encumbrance","label":"Encumbrance certificate (13 years)","required":true},
      {"id":"tax_receipts","label":"Property tax paid receipts","required":true},
      {"id":"undertaking","label":"Architect / owner undertaking","required":true}
    ]
  }',
  'Seed values — verify against current BBMP byelaws before use.'
),
(
  'Karnataka','Bengaluru Urban','BBMP','COMMERCIAL','2015-01-01','PUBLISHED',
  'BBMP Building Byelaws 2003 (amended 2015)',
  '{
    "far": [
      {"maxRoadWidthM":12,"far":2.00,"coveragePct":65,"clause":"BBMP §6.1"},
      {"maxRoadWidthM":18,"far":2.50,"coveragePct":65,"clause":"BBMP §6.2"},
      {"maxRoadWidthM":24,"far":2.75,"coveragePct":65,"clause":"BBMP §6.3"},
      {"maxRoadWidthM":30,"far":3.25,"coveragePct":65,"clause":"BBMP §6.4"},
      {"maxRoadWidthM":9999,"far":3.50,"coveragePct":65,"clause":"BBMP §6.5"}
    ],
    "setbacks": [
      {"maxHeightM":11.5,"frontM":3.0,"rearM":1.5,"sideM":1.5,"clause":"BBMP §7.1"},
      {"maxHeightM":15,"frontM":5.0,"rearM":3.0,"sideM":3.0,"clause":"BBMP §7.2"},
      {"maxHeightM":18,"frontM":6.0,"rearM":3.0,"sideM":3.0,"clause":"BBMP §7.3"},
      {"maxHeightM":24,"frontM":7.0,"rearM":5.0,"sideM":5.0,"clause":"BBMP §7.4"},
      {"maxHeightM":9999,"frontM":10.0,"rearM":7.0,"sideM":7.0,"clause":"BBMP §7.5"}
    ],
    "heightLimits":{"absoluteMaxM":45,"floorHeightM":3.5,"clause":"BBMP §8.2"},
    "parking":{
      "car":{"sqmPerECS":50,"basis":"built_up","clause":"BBMP §15.2"},
      "twoWheeler":{"ratioOfCar":0.5,"clause":"BBMP §15.3"},
      "cycle":{"sqmPerSlot":100,"clause":"BBMP §15.4"}
    },
    "basement":{
      "maxDepthM":4.5,
      "ventilationOpeningPct":2.5,
      "permittedUses":["PARKING","UTILITIES","STORAGE","RETAIL"],
      "clause":"BBMP §20"
    },
    "sustainability":{
      "rainwaterHarvesting":{"minPitVolumeLtrPerSqm":0.5,"clause":"BBMP §30.1"},
      "solarPanels":{"minSqmPer100SqmBuiltUp":0,"clause":""},
      "evCharging":{"minPctParking":20,"clause":"BBMP §31.2"},
      "greenCover":{"minPctSiteArea":10,"clause":"BBMP §32.1"}
    },
    "approvalDocs":[
      {"id":"ownership","label":"Title deed / ownership document","required":true},
      {"id":"topo_survey","label":"Topographic survey plan","required":true},
      {"id":"site_plan","label":"Site plan (scale 1:500 or better)","required":true},
      {"id":"building_plan","label":"Building plan (floor plans, elevations, sections)","required":true},
      {"id":"structural_cert","label":"Structural stability certificate","required":true},
      {"id":"fire_noc","label":"Fire NOC","required":true},
      {"id":"khata","label":"Khata extract","required":true},
      {"id":"encumbrance","label":"Encumbrance certificate (13 years)","required":true},
      {"id":"tax_receipts","label":"Property tax paid receipts","required":true},
      {"id":"trade_licence","label":"Trade licence (if applicable)","required":false},
      {"id":"undertaking","label":"Architect / owner undertaking","required":true}
    ]
  }',
  'Seed values — verify against current BBMP byelaws before use.'
);
