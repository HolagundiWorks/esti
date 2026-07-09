# Extracted regulation data (normalized for the calculator)

Source docs in this folder. Values below are what the app encodes. Where a doc was
garbled or multidimensional, the app uses the noted approximation + a per-city basis note.

## Models
- **depthwidth** setbacks: front/rear by DEPTH band, left/right by WIDTH band, per zone. Each city has its own band edges.
- **percent** setbacks: small fixed bands, then front=12%·depth, rear=8%·depth, side=8%·width (min 1.0) — varies per city.
- **plotsize** setbacks (KCBB): front/rear/right/left by plot-area × road-width.
- **fc area_road**: coverage by plot area (per zone) + FAR by road width (per zone).
- **fc plotsize**: coverage+FAR by plot area (per zone) — Mysuru; single col — Tumkur.
- **fc flat/fsi**: fixed FAR (Pune base FSI 1.1; Mysuru Commercial-Central 2.5/75%).

## Hosapete (Master Plan Rev-1) — depthwidth edges [6,9,12,18,24]
Table-1 (CORRECTED from full image, cols 2-14) — Front/Rear by DEPTH, Left/Right by WIDTH, asymmetric per zone:
  bands: Upto6 / Over6-9 / Over9-12 / Over12-18 / Over18-24 / Over24
  Residential  Front [1.00,1.00,1.00,1.50,2.00,2.50]  Rear [0,1.00,1.00,1.00,1.50,2.00]
               Left  [0,1.00,1.00,1.50,2.00,2.50]      Right[1.00,1.00,1.00,2.00,3.00,3.00]
  Commercial   Front [1.00,1.50,1.50,2.00,2.50,3.00]  Rear [0,0,1.00,1.50,2.00,2.50]
               Left  [0,0,1.00,1.50,2.00,2.50]          Right[1.00,1.00,1.50,2.00,2.50,3.00]
  T&T/PU/PSP   Front [1.50,1.50,2.00,2.50,3.00,3.50]  Rear [0,1.50,1.50,1.50,2.00,2.50]
               Left  [0,1.00,1.50,1.75,2.50,3.00]      Right[1.00,1.50,1.75,2.50,3.00,4.00]
  (Earlier symmetric-side approximation replaced; also fixes old Commercial Front/Rear at Over18-24.)
  Verified: Res width 12.5 → Left 1.5 / Right 2.0. No ≤120 sqm side relief (table gives explicit values incl. 0).
Coverage Res 70/65/60/55 (500/750/1000/>); Com 65/60/55/50; PSP 60/55/50/50; Ind 80(≤230)/65/55.
FAR-by-road Res 1.5/1.75/2.0/2.25 (9/12/18/>); Com 1.75/2.0/2.5/3.0; PSP 1.5/1.75/2.0/2.25; Ind 1.5/1.75.
Building line Table-18. Parking Table-11, Corridor Table-12. High-rise Table-2 (>15m).

## Gulbarga (Byelaws 2011) — clean
Coverage(Res/Com/PSP): ≤110 75/70/65; ≤240 70/65/60; ≤500 65/60/55; ≤750 60/55/55; ≤1000 55/55/55; ≤5000 55/50/50.
FAR-by-road(Res/Com/PSP): <6 1.5/1.75/1.25; 6-9 1.75/2.0/1.5; 9-12 2.0/2.25/1.75; 12-18 2.25/2.5/2.0; ≥18 2.5/2.75/2.25.
Industrial(area): ≤110 75%/1.25; ≤240 80/1.5; ≤500 75/1.75; ≤750 60/2.0; ≤1000 50/2.25; ≤5000 50/2.5.
Setbacks (CORRECTED — Table-2/3, PERCENT model, not bands):
  Res/Com: ≤6 {Rt1,L0(one side),F1,R0}; 6-9 {1 all}; >9 Right 8%, Left 8%, Front 12%, Rear 8% (min 1.0).
  T&T/PU/PSP: ≤9 {Rt1,L0,F1.25,R1}; >9 Right 12%, Left 12%, Front 15%, Rear 12% (min 1.0).

## High-rise (>threshold m) all-around setbacks by height — all zones
Hosapete (Table-2, thr 15): 15-18 4.5;18-21 5;21-24 6;24-27 7;27-30 8;30-35 9;35-40 10;40-45 11;45-50 12;>50 13.
Belgaum (Table-3, thr 15): 5;6;7;8;9;10(30-33);11(33-36);12(36-40);13(40-45);14(45-50);16(>50).
Gulbarga (Table-4, thr 15)=KCBB base: 15-18 6;7;8;9;10;11;12;13;14;>50 16.
Mysuru (Table 5-2, thr 11.5): 11.5-15 5;15-18 6;...;45-50 14;>50 16.
Tumkur (Table-3, thr 11.5): 5;6;7;8;9;10;11;12;13;45-50 15;>50 16.
KCBB (Table-5, thr 15): 6;7;8;9;10;11;12;13;14;50-55 16;>55 +2m per 5m.
Hubli/Greater Bengaluru: high-rise table not clean in doc → common Karnataka set applied (thr 15 / 12).
Pune (Reg 17.3, thr 15): side/rear = H/4 (min 3.0 res / 4.5 com / 6.0 special, max 16); front per Table 16/17.
App: a Building-height input triggers the override when height > threshold (all zones, all-around).

## Belgaum (Master Plan 2021 Rev-II) — depthwidth edges [7,10,13,19,25]
Res  front[1,1,1.5,2,2.5,3.5] rear[0,1,1,1.5,2,2.5] left[0,1,1,1.25,2,2.5] right[1,1,1.5,2.5,3,3.5]
Com  front[1,1,1.5,2,2.25,3.25] rear[0,0,1,1.5,2,2.5] left[0,0,1,1.25,1.75,2.25] right[0,1,1.5,2.25,2.75,3.25]
PSP  front[1.5,1.5,2,2.5,3,4] rear[0,1,1.5,2,2.5,3] left[0,1.5,1.75,2,3,3.5] right[1.5,1.5,2,3,3,4.25]
FAR: Table-4 varies by road×plotsize×(intensive/moderate). App uses intensively-populated approx by road: 1.5/1.75/2.0/2.5/3.0. Coverage max 75%; uses Gulbarga-like area bands. Industrial Table-6.

## Hubli-Dharwad (RCDP) — depthwidth edges [6,9,12,18,24]
Res front[1,1,1.5,2,3,4] rear[0,1,1,1.5,2,3] left[0,1,1,1.5,2,3] right[1,1,1.5,2.5,3,4]
Com front[1,1.5,2,2.5,2.75,3.25] rear[0,0,1,1.5,2.25,2.75] left[0,0,1,1.5,1.75,2.75] right[0,1,1.5,2.5,2.75,3.75]
PSP front[1.5,1.5,3,3.5,4,4.25] rear[0,1.5,1.5,1.75,2,3] left[0,1.5,1.75,2,3,3.5] right[1.5,1.5,1.5,3,3,4.25]
FC: doc garbled — uses KTCP-standard (Hosapete-like).

## Mysuru (MP-II 2031) — percent; small ≤6 {F1,R0,Rt1,L0}, 6-9 {1 all}, >9 F12%/R8%/side8% min1
FC plotsize per zone:
Res(Mixed): ≤360 70%/1.5; ≤1000 65/2.0; ≤2000 60/2.25; ≤4000 55/2.5; >4000 50/2.5
Com(Central): flat 75%/2.5
PSP: ≤500 60/1.5; ≤1000 55/1.75; ≤2000 50/2.0; >2000 45/2.25
Ind(General): ≤230 80/1.0; ≤1000 60/1.25; ≤2000 50/1.25; ≤4000 40/1.25; ≤8000 35/1.0; >8000 30/0.5

## Tumkur (MP Rev-II) — percent, per zone
Res/Com: ≤6 {Rt0.5,L0,F1,R0}; 6-9 {0.5,0.5,1,0.5}; >9 side8%/front12%/rear8%
PSP/T&T: ≤9 {Rt1,L0,F1.25,R1}; >9 side12%/front15%/rear12%
FC by area (all zones): ≤250 70%/1.5; ≤1000 65/2.0; ≤5000 55/2.5.

## Greater Bengaluru (RMP-2015, 2025 amendment) — percent_area
Setback ≤60 small; 60-150 {F0.9,R0.7,side0.7}; 150-4000 F12%d/R8%d/side8%w; >4000 5.0 all.
FC: RMP-2015 (not in amendment doc) — representative FAR-by-road 1.75/2.25/2.5/3.0/3.25; noted.

## Pune (PMRDA DCPR-2018) — Part IV (Setback, Marginal Distance, Height & FSI)
Setbacks driven by ROAD CLASS (Table-16) for residential ≤15 m:
  NH F6/side3/rear3; SH F4.5/3/3; MDR/ODR F6/3/3; road≥24 F4.5/3/3; road18-24 F4.5/3/3;
  road15-18 F3/2.25/2.25; road9-15 F3/1.5/1.5; road≤9 F3/1.5/1.5;
  row-housing≤12m F2.25/0/1.5; row EWS/LIG F2.25/0/0.9.
Other buildings — Table-17: Commercial/hotel/mix F6/side4.5/rear4.5; Public&SP 6 all sides.
Industrial — Table-19 (road≥12m): ≤1000 F4.5/3; 1001-5000 F6/4.5; >5000 F9/6. Basic FSI 1.10.
FSI — Table-18 by road width (Basic / Max building potential incl. Premium+TDR):
  <9 1.0/1.0; 9-12 1.0/1.4; 12-15 1.0/1.5; 15-24 1.1/1.7; 24-30 1.2/1.9; ≥30 1.2/2.0.
Model: setback='pune' (road-class driven), fc='fsi_road'. The road-class dropdown is
repopulated with Table-16 categories for Pune and drives setbacks (not a building line).

## KCBB (Karnataka Common Building Byelaws 2025) — plotsize setbacks
Res Table-4 & Non-res Table-4A by area×road (front/rear/right/left). FC: standard Karnataka approx.

## Shared
Parking = KTCP Table-11 (car 2.5×5.0). Corridor = Table-12. Two-wheeler = 25% of cars.
