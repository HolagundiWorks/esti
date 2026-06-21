/**
 * Reference FAR / coverage / setback data for major Indian cities.
 *
 * Source regulations are cited per city. Values are representative bands
 * from each ULB's published DCR; architects should verify against the
 * current gazetted regulation for each project.
 *
 * status "computed" — full engine via computeBylawEnvelope()
 * status "reference" — lookup table only; full engine not yet available
 */

export interface SetbackRef {
  front: string;
  rear: string;
  side: string;
}

export interface ZoneUsage {
  type: "RESIDENTIAL" | "COMMERCIAL" | "MIXED" | "INDUSTRIAL";
  /** Describes when this row applies (plot size band, zone name, road width) */
  condition: string;
  farMin: number;
  farMax: number;
  /** Ground coverage in % */
  coverageMax: number;
  setbacks: SetbackRef;
  parking?: string;
}

export interface CityRegs {
  id: string;
  city: string;
  state: string;
  authority: string;
  regulation: string;
  year: number;
  status: "computed" | "reference";
  zones: ZoneUsage[];
  notes: string[];
  source: string;
}

export const CITY_REGS: CityRegs[] = [
  {
    id: "bbmp-bengaluru",
    city: "Bengaluru",
    state: "Karnataka",
    authority: "BBMP — Bruhat Bengaluru Mahanagara Palike",
    regulation: "BBMP Building Bye-Laws",
    year: 2003,
    status: "computed",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Zone A (Core) — site ≤ 250 m²",
        farMin: 0.75, farMax: 1.00, coverageMax: 50,
        setbacks: { front: "3 m (or RBL)", rear: "1.5 m", side: "1.5 m" },
        parking: "1 ECS / 125 m² built-up",
      },
      {
        type: "RESIDENTIAL",
        condition: "Zone A (Core) — site 250–500 m²",
        farMin: 1.00, farMax: 1.25, coverageMax: 50,
        setbacks: { front: "3 m (or RBL)", rear: "1.5 m", side: "1.5 m" },
        parking: "1 ECS / 125 m² built-up",
      },
      {
        type: "RESIDENTIAL",
        condition: "Zone B (Inner) — site ≤ 500 m²",
        farMin: 1.25, farMax: 1.75, coverageMax: 55,
        setbacks: { front: "3 m", rear: "1.5 m", side: "1.5–3 m" },
        parking: "1 ECS / 125 m² built-up",
      },
      {
        type: "RESIDENTIAL",
        condition: "Zone C/D (Outer / Peripheral)",
        farMin: 1.75, farMax: 2.25, coverageMax: 60,
        setbacks: { front: "3 m", rear: "1.5 m", side: "1.5–3 m" },
        parking: "1 ECS / 100 m² built-up",
      },
      {
        type: "COMMERCIAL",
        condition: "All zones — road ≥ 12 m",
        farMin: 1.75, farMax: 3.25, coverageMax: 70,
        setbacks: { front: "RBL or 4.5 m", rear: "3 m", side: "3 m" },
        parking: "1 ECS / 50 m² GFA",
      },
    ],
    notes: [
      "Full computation available — use the 'Bengaluru (BBMP)' form above for exact FAR, setbacks, and parking.",
      "FAR and coverage depend on development area (A/B/C/D), site area band, and front road width.",
      "Highrise (> 9.5 m) setbacks are uniform and height-dependent.",
      "Rainwater harvesting mandatory for sites > 1200 m².",
    ],
    source: "BBMP Building Bye-Laws 2003, as amended; Karnataka Government Gazette.",
  },

  {
    id: "mcgm-mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    authority: "MCGM — Municipal Corporation of Greater Mumbai",
    regulation: "UDCPR — Unified Development Control & Promotion Regulations for Maharashtra",
    year: 2020,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Plotted development (Mumbai island/suburb) — road < 9 m",
        farMin: 1.0, farMax: 1.33, coverageMax: 50,
        setbacks: { front: "1.5 m", rear: "1.5 m", side: "1.5 m" },
        parking: "1 ECS / 1 dwelling unit (unit > 70 m² carpet)",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plotted development — road 9–18 m",
        farMin: 1.0, farMax: 2.0, coverageMax: 45,
        setbacks: { front: "4.5 m", rear: "3 m", side: "2.25 m" },
        parking: "1 ECS / 1 dwelling unit (unit > 70 m² carpet)",
      },
      {
        type: "RESIDENTIAL",
        condition: "Group housing / highrise — road > 18 m",
        farMin: 2.5, farMax: 3.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "6 m", side: "5 m (or H/6)" },
        parking: "2 ECS / 1 unit (unit > 120 m²); 1 ECS otherwise",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial on road > 18 m",
        farMin: 1.5, farMax: 5.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "6 m", side: "4.5 m" },
        parking: "1 ECS / 25 m² retail; 1 ECS / 40 m² office",
      },
    ],
    notes: [
      "UDCPR 2020 replaced the old Mumbai DCR 1991 for the entire state.",
      "Fungible FSI: additional 35% (residential) or 20% (other) of base FSI available on payment of premium.",
      "TDR (Transfer of Development Rights) may load additional FSI beyond the base+fungible.",
      "Affordable housing projects attract enhanced FSI — verify with MCGM for current notifications.",
      "No separate 'zones A–D'; FSI is primarily road-width and use-type dependent.",
    ],
    source: "UDCPR 2020 (Unified Development Control and Promotion Regulations for Maharashtra), Government of Maharashtra.",
  },

  {
    id: "dda-delhi",
    city: "Delhi",
    state: "Delhi (NCT)",
    authority: "DDA — Delhi Development Authority",
    regulation: "Master Plan for Delhi (MPD)",
    year: 2041,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Plotted housing — plot < 50 m²",
        farMin: 2.0, farMax: 3.5, coverageMax: 75,
        setbacks: { front: "0–1.5 m", rear: "0–1.5 m", side: "0 m" },
        parking: "Not mandatory for EWS plots",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plotted housing — plot 50–250 m²",
        farMin: 1.2, farMax: 2.5, coverageMax: 50,
        setbacks: { front: "3 m", rear: "3 m", side: "1.5–3 m" },
        parking: "1 ECS / 3 DUs or 1 ECS / 100 m²",
      },
      {
        type: "RESIDENTIAL",
        condition: "Group housing — plot > 3000 m²",
        farMin: 1.5, farMax: 4.0, coverageMax: 33,
        setbacks: { front: "10 m (main road)", rear: "6 m", side: "6 m" },
        parking: "2 ECS / DU (> 167 m²); 1 ECS / DU otherwise",
      },
      {
        type: "MIXED",
        condition: "Transit-Oriented Development (TOD) — within 500 m of metro",
        farMin: 3.5, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "6 m", side: "6 m" },
        parking: "Reduced parking (zone-specific); shared parking encouraged",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial / district centre",
        farMin: 1.5, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "6–10 m", rear: "6 m", side: "6 m" },
        parking: "1 ECS / 25 m² retail; 1 ECS / 40 m² office",
      },
    ],
    notes: [
      "MPD 2041 supersedes MPD 2021; full gazetted regulations awaited.",
      "Delhi Building Bye-Laws 1983 (as amended) govern construction standards alongside MPD.",
      "North/South/East/West MCDs enforce the bye-laws; jurisdiction-specific rules apply.",
      "Green Building norms (BEE star rating) mandatory for buildings > 500 m² GFA.",
      "Ground coverage and setbacks for lowrise vs. highrise differ significantly.",
    ],
    source: "Master Plan for Delhi 2041 (draft), Delhi Building Bye-Laws 1983 (amended), DDA.",
  },

  {
    id: "cmda-chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    authority: "CMDA — Chennai Metropolitan Development Authority",
    regulation: "Chennai Metropolitan Area Development Regulations",
    year: 2023,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Plot ≤ 80 m² / road < 6 m",
        farMin: 1.5, farMax: 1.5, coverageMax: 75,
        setbacks: { front: "0 m", rear: "1 m", side: "0 m" },
        parking: "Not required",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot 80–200 m² / road 6–10 m",
        farMin: 1.5, farMax: 2.0, coverageMax: 65,
        setbacks: { front: "2 m", rear: "1.5 m", side: "1 m" },
        parking: "1 ECS / 2 DUs",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot 200–500 m² / road 10–18 m",
        farMin: 2.0, farMax: 2.5, coverageMax: 55,
        setbacks: { front: "3 m", rear: "2 m", side: "1.5 m" },
        parking: "1 ECS / 1 DU (> 80 m²); 1 ECS / 2 DUs otherwise",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot > 500 m² / road > 18 m",
        farMin: 2.5, farMax: 3.0, coverageMax: 45,
        setbacks: { front: "4.5 m", rear: "3 m", side: "2.25 m" },
        parking: "1.5 ECS / 1 DU",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial — road ≥ 12 m",
        farMin: 2.0, farMax: 3.0, coverageMax: 55,
        setbacks: { front: "4.5 m", rear: "3 m", side: "3 m" },
        parking: "1 ECS / 35 m²",
      },
    ],
    notes: [
      "CMDA 2023 Development Regulations revised FSI upward for TOD and mixed-use corridors.",
      "Special Economic Zone and IT corridor projects have separate FSI relaxations.",
      "Chennai Corporation (GCC) building rules govern structural and safety standards.",
      "Premium FSI available for affordable housing and green-certified buildings.",
      "Stilts + open parking allowed within setbacks for residential up to 4 floors.",
    ],
    source: "Chennai Metropolitan Area Development Regulations 2023, CMDA / Government of Tamil Nadu.",
  },

  {
    id: "ghmc-hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    authority: "GHMC — Greater Hyderabad Municipal Corporation",
    regulation: "GHMC Building Regulations + GO Ms. 168 (LRS)",
    year: 2012,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Plot < 100 m²",
        farMin: 1.5, farMax: 1.75, coverageMax: 75,
        setbacks: { front: "1 m", rear: "1 m", side: "0–1 m" },
        parking: "Not required",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot 100–200 m²",
        farMin: 1.75, farMax: 2.0, coverageMax: 65,
        setbacks: { front: "2 m", rear: "1.5 m", side: "1 m" },
        parking: "1 ECS / 2 DUs",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot 200–500 m²",
        farMin: 2.0, farMax: 2.75, coverageMax: 55,
        setbacks: { front: "3–6 m", rear: "2 m", side: "1.5 m" },
        parking: "1 ECS / 1 DU",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot 500–1000 m² / highrise",
        farMin: 2.75, farMax: 3.25, coverageMax: 45,
        setbacks: { front: "6–9 m", rear: "3 m", side: "3 m" },
        parking: "1.5 ECS / 1 DU",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plot > 1000 m² (group housing)",
        farMin: 3.25, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "9 m", rear: "6 m", side: "4.5 m" },
        parking: "2 ECS / 1 DU",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial — road ≥ 18 m",
        farMin: 3.0, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "9 m", rear: "6 m", side: "4.5 m" },
        parking: "1 ECS / 50 m²",
      },
    ],
    notes: [
      "GO Ms. 168 (2016, LRS) rationalized FAR across old Hyderabad + merged areas.",
      "SRDP (Strategic Road Development Plan) corridors have enhanced FAR incentives.",
      "Building permissions above 15 m require GHMC fire NOC and structural certificate.",
      "Hyderabad Metro Rail influence zone: TOD regulations apply within 500 m of stations.",
      "Heritage areas (old city) have separate conservation zone regulations.",
    ],
    source: "GHMC Building Regulations 2012, GO Ms. 168 (LRS), Government of Telangana.",
  },

  {
    id: "pmc-pune",
    city: "Pune",
    state: "Maharashtra",
    authority: "PMC — Pune Municipal Corporation",
    regulation: "UDCPR — Unified Development Control & Promotion Regulations for Maharashtra",
    year: 2020,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Plotted — road < 9 m",
        farMin: 1.1, farMax: 1.5, coverageMax: 50,
        setbacks: { front: "1.5 m", rear: "1.5 m", side: "1.5 m" },
        parking: "1 ECS / 1 DU (> 70 m² carpet)",
      },
      {
        type: "RESIDENTIAL",
        condition: "Plotted — road 9–18 m",
        farMin: 1.1, farMax: 2.2, coverageMax: 45,
        setbacks: { front: "3 m", rear: "3 m", side: "2.25 m" },
        parking: "1 ECS / 1 DU (> 70 m²)",
      },
      {
        type: "RESIDENTIAL",
        condition: "Group housing — plot > 4000 m²",
        farMin: 1.75, farMax: 3.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "6 m", side: "5 m (or H/6)" },
        parking: "1.5 ECS / 1 DU",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial — road > 18 m",
        farMin: 1.5, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "6 m", side: "4.5 m" },
        parking: "1 ECS / 25 m² retail; 1 ECS / 40 m² office",
      },
    ],
    notes: [
      "Pune follows Maharashtra UDCPR 2020 (same base regulation as Mumbai).",
      "Fungible FSI: additional 40% of base FSI available on payment of premium to PMC.",
      "IT/ITeS parks on peripheral ring road: FSI up to 5.0 with amenity space.",
      "Solar panels mandatory for buildings > 500 m² GFA.",
      "PMC's 2017 DP (Development Plan) zones determine permitted uses.",
    ],
    source: "UDCPR 2020 (Unified Development Control and Promotion Regulations for Maharashtra), Government of Maharashtra.",
  },

  {
    id: "kmc-kolkata",
    city: "Kolkata",
    state: "West Bengal",
    authority: "KMC — Kolkata Municipal Corporation",
    regulation: "KMC Building Rules",
    year: 2009,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Zone I (core/central) — plot < 500 m²",
        farMin: 2.0, farMax: 2.5, coverageMax: 30,
        setbacks: { front: "4.5 m", rear: "4.5 m", side: "3 m" },
        parking: "1 ECS / 2 DUs",
      },
      {
        type: "RESIDENTIAL",
        condition: "Zone II (inner) — plot any size",
        farMin: 2.0, farMax: 3.0, coverageMax: 40,
        setbacks: { front: "3 m", rear: "3 m", side: "1.5 m" },
        parking: "1 ECS / 1 DU",
      },
      {
        type: "RESIDENTIAL",
        condition: "Zone III (outer / satellite) — road > 12 m",
        farMin: 2.5, farMax: 3.5, coverageMax: 45,
        setbacks: { front: "3 m", rear: "3 m", side: "1.5 m" },
        parking: "1 ECS / 1 DU",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial — Zone II/III, road > 18 m",
        farMin: 2.5, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "4.5 m", side: "3 m" },
        parking: "1 ECS / 30 m²",
      },
    ],
    notes: [
      "West Bengal Housing Board and KMDA norms may apply in fringe areas.",
      "KMC Rules 2009 amended multiple times; check current gazette for latest FAR table.",
      "Heritage Conservation Area (UNESCO-listed) in central Kolkata: height cap 14.5 m.",
      "Highrise (> 15 m) requires fire NOC from CFO West Bengal.",
      "Green Building Rating incentive: 10% FAR bonus for GRIHA 4-star and above.",
    ],
    source: "Kolkata Municipal Corporation Building Rules 2009 (as amended), West Bengal Gazette.",
  },

  {
    id: "auda-ahmedabad",
    city: "Ahmedabad",
    state: "Gujarat",
    authority: "AUDA / AMC — Ahmedabad Urban Development Authority / Municipal Corporation",
    regulation: "GDCR — Gujarat Development Control Regulations + TP Schemes",
    year: 2017,
    status: "reference",
    zones: [
      {
        type: "RESIDENTIAL",
        condition: "Old city / walled city — plot < 100 m²",
        farMin: 1.5, farMax: 2.0, coverageMax: 70,
        setbacks: { front: "1.5 m", rear: "1.5 m", side: "0–1 m" },
        parking: "Not required below 100 m² plot",
      },
      {
        type: "RESIDENTIAL",
        condition: "Residential zone (R1/R2) — plot 100–500 m²",
        farMin: 1.2, farMax: 1.8, coverageMax: 55,
        setbacks: { front: "4.5 m (AMC)", rear: "3 m", side: "2.25 m" },
        parking: "1 ECS / 2 DUs or 1 ECS / 150 m²",
      },
      {
        type: "RESIDENTIAL",
        condition: "TP Scheme / new areas — group housing",
        farMin: 1.8, farMax: 2.5, coverageMax: 40,
        setbacks: { front: "6 m", rear: "4.5 m", side: "3 m" },
        parking: "1 ECS / 1 DU",
      },
      {
        type: "COMMERCIAL",
        condition: "Commercial zone (C1/C2) — road > 18 m",
        farMin: 2.0, farMax: 4.0, coverageMax: 40,
        setbacks: { front: "6 m", rear: "4.5 m", side: "3 m" },
        parking: "1 ECS / 30 m²",
      },
    ],
    notes: [
      "GDCR 2017 provides the base; each ULB (AUDA / AMC) may have overlaid local rules.",
      "TP (Town Planning) Schemes apply to large parts of Ahmedabad: check scheme-specific FSI.",
      "Heritage Precincts (Ahmedabad is a UNESCO World Heritage City): special regulations apply.",
      "Premium FSI available for plots on roads > 18 m in AUDA jurisdiction.",
      "SIR (Special Investment Region) and GIDC industrial areas have separate norms.",
    ],
    source: "Gujarat Development Control Regulations 2017, AUDA / AMC, Government of Gujarat.",
  },
];

/** Fast city lookup by id */
export function getCityById(id: string): CityRegs | undefined {
  return CITY_REGS.find((c) => c.id === id);
}
