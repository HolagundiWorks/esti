-- Seed the NBC-IND-2016 rules catalog + per-zone authority limits into the
-- Compliance Library. Source: nbc_compliance/crates/nbc-core (ported here).
-- Re-runnable: clears prior NBC-IND-2016 seed rows first.

DELETE FROM esti_compliance_nbc WHERE clause LIKE 'NBC-%';
DELETE FROM esti_compliance_far WHERE notes = 'NBC-IND-2016 zone default';
DELETE FROM esti_compliance_setback WHERE notes = 'NBC-IND-2016 zone default';

-- ── NBC rules catalog (21) ──────────────────────────────────────────────────
INSERT INTO esti_compliance_nbc (clause, title, requirement, applicability) VALUES
  ('NBC-R001', 'Access Requirement', 'Every plot shall have clear approach access', 'Plot Development'),
  ('NBC-R002', 'Building Line', 'Building shall not exceed prescribed building line', 'Plot Development'),
  ('NBC-R003', 'Setback Line', 'Construction prohibited beyond setback line', 'Plot Development'),
  ('NBC-R004', 'Open Space', 'Minimum open spaces around plot mandatory', 'Plot Development'),
  ('NBC-R005', 'FAR Control', 'Floor Area Ratio to comply with authority limits', 'Plot Development'),
  ('NBC-R006', 'Ground Coverage', 'Plot coverage limited by local authority', 'Plot Development'),
  ('NBC-H001', 'Building Height', 'Vertical distance ground to terrace', 'Building Height'),
  ('NBC-H002', 'Tower Structures', 'Tower height >= 2x base width', 'Building Height'),
  ('NBC-H003', 'Aerodrome Restriction', 'Must comply with aviation limits', 'Building Height'),
  ('NBC-P001', 'Off Street Parking Mandatory', 'Off-street parking mandatory', 'Parking'),
  ('NBC-P002', 'Multi Level Parking Allowed', 'Multi-level parking allowed', 'Parking'),
  ('NBC-P003', 'Mechanical Parking Permitted', 'Mechanical parking permitted', 'Parking'),
  ('NBC-A001', 'Barrier Free Access', 'Barrier free access', 'Accessibility'),
  ('NBC-A002', 'Wheelchair Accessible Entry', 'Wheelchair accessible entry', 'Accessibility'),
  ('NBC-A003', 'Accessible Toilet Provision', 'Accessible toilet provision', 'Accessibility'),
  ('NBC-A004', 'Ramp Accessibility', 'Ramp accessibility', 'Accessibility'),
  ('NBC-A005', 'Elder Friendly Design', 'Elder friendly design', 'Accessibility'),
  ('NBC-F001', 'Minimum Fire Separation Distance', 'Minimum fire separation distance', 'Fire Separation'),
  ('NBC-F002', 'Means of Egress Required', 'Means of egress required', 'Fire Separation'),
  ('NBC-F003', 'Fire Tender Movement Access', 'Fire tender movement access', 'Fire Separation'),
  ('NBC-F004', 'Fire Safety Occupancy Compliance', 'Fire safety occupancy compliance', 'Fire Separation');

-- ── Per-zone FAR / coverage / height (13) ───────────────────────────────────
INSERT INTO esti_compliance_far (zone, plot_type, far, ground_coverage_pct, max_height_m, notes) VALUES
  ('R-1', 'Primary Residential Zone', 1.8, 50, 15, 'NBC-IND-2016 zone default'),
  ('R-2', 'Informal Residential Zone', 1.5, 60, 12, 'NBC-IND-2016 zone default'),
  ('C-1', 'Retail Shopping', 2.5, 60, 24, 'NBC-IND-2016 zone default'),
  ('C-2', 'General Business District', 3.0, 50, 45, 'NBC-IND-2016 zone default'),
  ('C-3', 'Warehousing', 1.5, 60, 18, 'NBC-IND-2016 zone default'),
  ('I-1', 'Light Industry', 1.5, 50, 18, 'NBC-IND-2016 zone default'),
  ('I-2', 'Heavy Industry', 1.2, 45, 24, 'NBC-IND-2016 zone default'),
  ('I-3', 'Hazardous Industry', 1.0, 40, 18, 'NBC-IND-2016 zone default'),
  ('PS-1', 'Government Offices', 2.0, 40, 30, 'NBC-IND-2016 zone default'),
  ('PS-4', 'Educational', 2.0, 40, 18, 'NBC-IND-2016 zone default'),
  ('PS-5', 'Medical', 2.5, 40, 30, 'NBC-IND-2016 zone default'),
  ('P-1', 'Playground/Stadium', 0.5, 15, 15, 'NBC-IND-2016 zone default'),
  ('P-2', 'Parks', 0.2, 5, 9, 'NBC-IND-2016 zone default');

-- ── Per-zone setbacks (13) ──────────────────────────────────────────────────
INSERT INTO esti_compliance_setback (zone, plot_type, front_m, rear_m, side1_m, side2_m, notes) VALUES
  ('R-1', 'Primary Residential Zone', 3.0, 3.0, 3.0, 3.0, 'NBC-IND-2016 zone default'),
  ('R-2', 'Informal Residential Zone', 2.0, 2.0, 1.5, 1.5, 'NBC-IND-2016 zone default'),
  ('C-1', 'Retail Shopping', 4.5, 3.0, 3.0, 3.0, 'NBC-IND-2016 zone default'),
  ('C-2', 'General Business District', 6.0, 4.5, 4.5, 4.5, 'NBC-IND-2016 zone default'),
  ('C-3', 'Warehousing', 6.0, 4.5, 4.5, 4.5, 'NBC-IND-2016 zone default'),
  ('I-1', 'Light Industry', 6.0, 6.0, 4.5, 4.5, 'NBC-IND-2016 zone default'),
  ('I-2', 'Heavy Industry', 9.0, 6.0, 6.0, 6.0, 'NBC-IND-2016 zone default'),
  ('I-3', 'Hazardous Industry', 12.0, 9.0, 9.0, 9.0, 'NBC-IND-2016 zone default'),
  ('PS-1', 'Government Offices', 6.0, 4.5, 4.5, 4.5, 'NBC-IND-2016 zone default'),
  ('PS-4', 'Educational', 6.0, 6.0, 4.5, 4.5, 'NBC-IND-2016 zone default'),
  ('PS-5', 'Medical', 6.0, 6.0, 6.0, 6.0, 'NBC-IND-2016 zone default'),
  ('P-1', 'Playground/Stadium', 6.0, 6.0, 6.0, 6.0, 'NBC-IND-2016 zone default'),
  ('P-2', 'Parks', 6.0, 6.0, 6.0, 6.0, 'NBC-IND-2016 zone default');
