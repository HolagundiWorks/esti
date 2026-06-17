-- Standard building construction DSR aligned with drawing takeoff codes (BM-230, RCC-SLAB-150, etc.).
CREATE UNIQUE INDEX IF NOT EXISTS "esti_dsr_item_version_code_unique"
  ON "esti_dsr_item" ("version_id", "code");
--> statement-breakpoint
INSERT INTO "esti_dsr_version" ("label", "description", "active")
VALUES (
  '2026-27 Building',
  'Standard building construction schedule (masonry, RCC, footings) aligned with drawing takeoff codes. Indicative Bengaluru market rates for estimation — verify against tender, CPWD, or state SSR before contractual use.',
  true
)
ON CONFLICT ("label") DO UPDATE SET
  "description" = EXCLUDED."description",
  "active" = true;
--> statement-breakpoint
UPDATE "esti_dsr_version" SET "active" = false WHERE "label" <> '2026-27 Building';
--> statement-breakpoint
INSERT INTO "esti_dsr_item" ("version_id", "code", "description", "unit", "rate_paise")
SELECT v."id", s."code", s."description", s."unit", s."rate_paise"
FROM "esti_dsr_version" v
CROSS JOIN (VALUES
  ('BM-230', 'Brick masonry 230 mm thick in cement mortar', 'rm', 850000),
  ('BM-200', 'Brick masonry 200 mm thick in cement mortar', 'rm', 780000),
  ('BM-115', 'Brick masonry 115 mm thick partition in cement mortar', 'rm', 560000),
  ('BM-110', 'Brick masonry 110 mm thick partition in cement mortar', 'rm', 540000),
  ('BM-100', 'Brick masonry 100 mm thick partition in cement mortar', 'rm', 500000),
  ('AAC-150', 'AAC block masonry 150 mm thick in adhesive mortar', 'rm', 680000),
  ('RCC-SLAB-100', 'RCC slab 100 mm thick M25', 'sqm', 485000),
  ('RCC-SLAB-125', 'RCC slab 125 mm thick M25', 'sqm', 545000),
  ('RCC-SLAB-150', 'RCC slab 150 mm thick M25', 'sqm', 610000),
  ('RCC-SLAB-200', 'RCC slab 200 mm thick M25', 'sqm', 760000),
  ('RCC-BEAM-230450', 'RCC beam 230 × 450 mm M25', 'rm', 1280000),
  ('RCC-BEAM-230600', 'RCC beam 230 × 600 mm M25', 'rm', 1520000),
  ('RCC-BEAM-300600', 'RCC beam 300 × 600 mm M25', 'rm', 1720000),
  ('RCC-COL-230', 'RCC column 230 × 230 mm M25', 'nos', 9500000),
  ('RCC-COL-300', 'RCC column 300 × 300 mm M25', 'nos', 13500000),
  ('RCC-COL-450', 'RCC column 450 × 450 mm M25', 'nos', 24000000),
  ('RCC-FTG-1000', 'Isolated RCC footing 1000 × 1000 × 450 mm M25', 'nos', 18500000),
  ('RCC-FTG-1200', 'Isolated RCC footing 1200 × 1200 × 500 mm M25', 'nos', 24500000),
  ('RCC-FTG-STRIP600', 'Strip RCC footing 600 mm wide × 450 mm deep M25', 'rm', 980000),
  ('EXC-SITE', 'Earthwork excavation in ordinary soil for foundation (manual/mechanical)', 'cum', 48000),
  ('PCC-100', 'Plain cement concrete 1:4:8, 100 mm thick under footing or floor', 'sqm', 540000),
  ('DPC-40', 'Damp proof course 40 mm thick with waterproof cement mortar', 'rm', 880000),
  ('PLASTER-INT', 'Internal cement plaster 12 mm thick in cement mortar (1:4)', 'sqm', 290000),
  ('PLASTER-EXT', 'External cement plaster 18 mm thick in cement mortar (1:4)', 'sqm', 360000),
  ('PAINT-INT', 'Interior emulsion paint — two coats on plastered surface', 'sqm', 125000),
  ('PAINT-EXT', 'Exterior acrylic weather-coat — two coats on plastered surface', 'sqm', 185000),
  ('FLOOR-VIT', 'Vitrified tile flooring 8–10 mm laid in cement mortar with grouting', 'sqm', 980000),
  ('WATERPROOF-WET', 'Wet-area waterproofing (toilet/balcony) with brickbat coba treatment', 'sqm', 680000),
  ('RC-1240', 'Reinforcement steel TMT Fe500D — supply, cutting, bending and placing', 'kg', 8500),
  ('SHUTTER-FORM', 'Centering and shuttering for RCC columns, beams and slabs', 'sqm', 420000),
  ('DOOR-TEAK', 'Teak wood door frame and shutter with fittings (standard size)', 'nos', 28000000),
  ('WINDOW-ALU', 'Powder-coated aluminium window with 4 mm clear glass', 'sqm', 4200000)
) AS s("code", "description", "unit", "rate_paise")
WHERE v."label" = '2026-27 Building'
ON CONFLICT ("version_id", "code") DO NOTHING;
