#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hosapete (Hospet) Zonal Regulations - Building Parameter Calculator
===================================================================
A desktop application that computes building parameters (setbacks, restricted
building line, FAR, ground coverage, corridor width and parking requirement)
based on the Hospet Local Planning Area Master Plan (Revision-1) Zonal
Regulations.

Runs on the Python standard library only (tkinter) - no external packages.

DISCLAIMER
----------
This calculator is a reference / planning aid only.  Several of the FAR and
plot-coverage figures were reconstructed from a scanned copy of the official
regulations.  Users MUST verify all values against the authoritative Hosapete
Master Plan (Revision-1) Zonal Regulations before using them for statutory
approval.
"""

import math
import tkinter as tk
from tkinter import ttk, messagebox

# --------------------------------------------------------------------------- #
#  Colour palette (approximation of the dashboard mock-up)
# --------------------------------------------------------------------------- #
NAVY        = "#0B2447"   # header / panel titles
NAVY_LIGHT  = "#19376D"
GOLD        = "#E4B45E"   # accent
PANEL_BG    = "#F4F6FB"   # light panel background
CARD_BG     = "#FFFFFF"
FIELD_BG    = "#FFFFFF"
TEXT_DARK   = "#0B2447"
TEXT_MUTED  = "#5A6B85"
GREEN_FILL  = "#CDE8CC"   # buildable area on diagram
GREEN_LINE  = "#4C8C4A"
RED_DASH    = "#D9534F"
BODY_BG     = "#E9EDF5"

INF = float("inf")

# --------------------------------------------------------------------------- #
#  REGULATION DATA
# --------------------------------------------------------------------------- #

# Depth / width bands used by Table-1 (metres).
#   index 0: up to 6      1: >6-9      2: >9-12
#         3: >12-18       4: >18-24    5: >24
def band_index(dim):
    if dim <= 6:   return 0
    if dim <= 9:   return 1
    if dim <= 12:  return 2
    if dim <= 18:  return 3
    if dim <= 24:  return 4
    return 5

BAND_LABELS = ["Up to 6", "Over 6 up to 9", "Over 9 up to 12",
               "Over 12 up to 18", "Over 18 up to 24", "Over 24"]

# TABLE-1  Front / Rear setbacks (m) for buildings up to 15 m height.
#   Columns: Residential | Commercial | Public&Semi-Public / T&T / P.U.
TABLE_1 = {
    "Residential":          {"front": [1.0, 1.0, 1.0, 1.5, 2.0, 2.5],
                             "rear":  [0.0, 1.0, 1.0, 1.0, 1.5, 2.0]},
    "Commercial":           {"front": [1.0, 1.5, 1.5, 2.0, 2.0, 3.0],
                             "rear":  [0.0, 0.0, 1.0, 1.5, 1.5, 2.5]},
    "Public & Semi-Public": {"front": [1.5, 1.5, 2.0, 2.5, 3.0, 3.5],
                             "rear":  [0.0, 1.5, 1.5, 1.5, 2.0, 2.5]},
}

# Simplified industrial setbacks (Tables 4-6 vary with plot area; these are the
# common minimums for a general industrial building).
INDUSTRIAL_SETBACK = {"front": 3.0, "rear": 3.0, "side": 1.0}

# Maximum plot coverage by plot area (sqm).  (band_upper, coverage_fraction)
COVERAGE = {
    "Residential":          [(500, 0.70), (750, 0.65), (1000, 0.60), (INF, 0.55)],
    "Commercial":           [(500, 0.65), (750, 0.60), (1000, 0.55), (INF, 0.50)],
    "Public & Semi-Public": [(500, 0.60), (750, 0.55), (1000, 0.50), (INF, 0.50)],
    "Industrial":           [(230, 0.80), (1000, 0.65), (INF, 0.55)],
}

# Permissible FAR by the width of the abutting road (m).  (road_upper, FAR)
# Note (Master Plan): FAR & number of floors are governed by road width.
FAR_BY_ROAD = {
    "Residential":          [(9, 1.50), (12, 1.75), (18, 2.00), (INF, 2.25)],
    "Commercial":           [(9, 1.75), (12, 2.00), (18, 2.50), (INF, 3.00)],
    "Public & Semi-Public": [(9, 1.50), (12, 1.75), (18, 2.00), (INF, 2.25)],
    "Industrial":           [(9, 1.50), (INF, 1.75)],
}

# TABLE-18  Building line measured from the CENTRE LINE of the road (m).
BUILDING_LINE = {
    "National Highway No. 13 & 63 (outer)": 40.0,
    "National Highway No. 13 & 63":         21.0,
    "State Highway (outer)":                40.0,
    "State Highway":                        21.0,
    "Major District Road (outer)":          25.0,
    "Major District Road":                  13.0,
    "30 m wide road":                       21.0,
    "24 m wide road":                       15.0,
    "20 m wide road":                       13.0,
    "18 m wide road":                       11.0,
    "Other / local road (no building line)": None,
}

# TABLE-12  Minimum corridor width (m) by building use category.
CORRIDOR = {
    "Residential building":            1.00,
    "Assembly (auditorium / cinema)":  2.00,
    "Government office":               2.00,
    "Government hospital":             2.40,
    "Educational institution":         2.00,
    "Commercial (office/nursing/lodge)": 2.00,
    "All other buildings":             1.50,
}

# Car parking space dimensions.
CAR_L, CAR_W = 5.0, 2.5
CAR_AREA = CAR_L * CAR_W          # 12.5 sqm

# --------------------------------------------------------------------------- #
#  BUILDING-TYPE catalogue
#  Each entry defines:
#     corridor : key into CORRIDOR
#     park     : parking rule id
#     qty      : label for the dynamic "parking basis" input (or None)
#     tenement : True if the "number of tenements" input applies
# --------------------------------------------------------------------------- #
BUILDING_TYPES = {
    "Residential building (single unit)":
        dict(corridor="Residential building", park="residential",
             qty=None, tenement=False),
    "Apartment / Multi-family residential":
        dict(corridor="Residential building", park="multifamily",
             qty="Carpet area per tenement (sqm)", tenement=True),
    "Lodging establishment / Tourist home":
        dict(corridor="All other buildings", park="lodging",
             qty="Number of guest rooms", tenement=False),
    "Educational (school / college)":
        dict(corridor="Educational institution", park="educational",
             qty="Carpet area of office+public areas (sqm)", tenement=False),
    "Hospital":
        dict(corridor="Government hospital", park="hospital",
             qty="Number of beds", tenement=False),
    "Nursing home":
        dict(corridor="Commercial (office/nursing/lodge)", park="nursing",
             qty="Number of beds", tenement=False),
    "Assembly / Auditorium / Cinema theatre":
        dict(corridor="Assembly (auditorium / cinema)", park="assembly",
             qty="Number of seats", tenement=False),
    "Kalyana Mantapa":
        dict(corridor="Assembly (auditorium / cinema)", park="kalyana",
             qty="Auditorium floor area (sqm)", tenement=False),
    "Government / Semi-public building":
        dict(corridor="Government office", park="govt",
             qty="Carpet area (sqm)", tenement=False),
    "Retail business / Shop":
        dict(corridor="All other buildings", park="retail",
             qty="Carpet area (sqm)", tenement=False),
    "Office building":
        dict(corridor="Government office", park="office",
             qty="Floor area (sqm)", tenement=False),
    "Industrial building":
        dict(corridor="All other buildings", park="industrial",
             qty="Carpet area (sqm)", tenement=False),
    "Storage / Warehouse":
        dict(corridor="All other buildings", park="storage",
             qty="Storage area (sqm)", tenement=False),
    "Restaurant / Food & Beverage":
        dict(corridor="All other buildings", park="restaurant",
             qty="Floor area (sqm)", tenement=False),
    "Hostel":
        dict(corridor="All other buildings", park="hostel",
             qty="Number of rooms", tenement=False),
}

ZONES = ["Residential", "Commercial", "Public & Semi-Public", "Industrial"]


# --------------------------------------------------------------------------- #
#  COMPUTATION HELPERS
# --------------------------------------------------------------------------- #
def lookup_step(table, key):
    """Return value from a list of (upper_bound, value) tuples."""
    for upper, val in table:
        if key <= upper:
            return val
    return table[-1][1]


def setbacks_for(zone, depth, width, plot_area):
    """Return dict with front, rear, left, right setbacks (m)."""
    if zone == "Industrial":
        return dict(front=INDUSTRIAL_SETBACK["front"],
                    rear=INDUSTRIAL_SETBACK["rear"],
                    left=INDUSTRIAL_SETBACK["side"],
                    right=INDUSTRIAL_SETBACK["side"],
                    fr_band=None, side_band=None)

    t = TABLE_1[zone]
    d_idx = band_index(depth)      # front/rear governed by DEPTH of site
    w_idx = band_index(width)      # left/right governed by WIDTH of site

    front = t["front"][d_idx]
    rear = t["rear"][d_idx]
    # Table-1 has no separate side column; the front-column value of the
    # width band is applied to both side setbacks (symmetrical sides).
    side = t["front"][w_idx]

    # Small residential plot relief (>=1.0 m open space rule).
    if zone == "Residential" and plot_area <= 120:
        side = max(side, 1.0)

    return dict(front=front, rear=rear, left=side, right=side,
                fr_band=d_idx, side_band=w_idx)


def far_and_coverage(zone, plot_area, road_width):
    coverage = lookup_step(COVERAGE[zone], plot_area)
    far = lookup_step(FAR_BY_ROAD[zone], road_width)
    return far, coverage


def parking_required(park_id, ctx):
    """
    Return (car_spaces, basis_text).  ctx is a dict of parsed inputs:
        tenements, qty
    """
    q = ctx.get("qty", 0.0)
    ten = ctx.get("tenements", 0)

    def ceil_div(a, b):
        return int(math.ceil(a / b)) if b else 0

    if park_id == "residential":
        return max(1, 0), "Minimum one car space (2.50 m x 5.00 m)"

    if park_id == "multifamily":
        # 1 car per 2 tenements (carpet 75-150 sqm); >150 sqm -> 1 per tenement.
        if ten <= 0:
            return 1, "Minimum one car space"
        if q > 150:
            spaces = ten
            basis = "1 car per tenement (carpet area > 150 sqm)"
        else:
            spaces = ceil_div(ten, 2)
            basis = "1 car per 2 tenements (carpet area 75-150 sqm)"
        return max(1, spaces), basis

    if park_id == "lodging":
        return max(1, ceil_div(q, 8)), "1 car per 8 guest rooms"

    if park_id == "educational":
        return ceil_div(q, 200), "1 car per 200 sqm of office + public areas"

    if park_id == "hospital":
        return max(1, ceil_div(q, 15)), "1 car per 15 beds (min 195 sqm)"

    if park_id == "nursing":
        return max(1, ceil_div(q, 7)), "1 car per 7 beds (min 195 sqm)"

    if park_id == "assembly":
        return ceil_div(q, 50), "1 car per 50 seats"

    if park_id == "kalyana":
        return ceil_div(q, 30), "1 car per 30 sqm of auditorium floor area"

    if park_id == "govt":
        return ceil_div(q, 150), "1 car per 150 sqm carpet area"

    if park_id == "retail":
        if q <= 100:
            return 0, "No parking insisted up to 100 sqm (shops)"
        return ceil_div(q, 100), "1 car per 100 sqm carpet area"

    if park_id == "office":
        return ceil_div(q, 100), "1 car per 100 sqm floor area"

    if park_id == "industrial":
        return ceil_div(q, 200), "1 car per 200 sqm carpet area"

    if park_id == "storage":
        if q <= 500:
            return ceil_div(q, 100), "1 car per 100 sqm (up to 500 sqm)"
        spaces = 5 + ceil_div(q - 500, 200)
        return spaces, "1 per 100 sqm to 500 sqm, then 1 per 200 sqm"

    if park_id == "restaurant":
        return ceil_div(q, 75), "1 car per 75 sqm floor area"

    if park_id == "hostel":
        return ceil_div(q, 15), "1 car per 15 rooms"

    return 0, "-"


# --------------------------------------------------------------------------- #
#  MAIN APPLICATION
# --------------------------------------------------------------------------- #
class ZoningApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Hosapete Zonal Regulations - Building Parameter Calculator")
        self.geometry("1180x760")
        self.minsize(1000, 640)
        self.configure(bg=BODY_BG)

        self._init_style()
        self._build_header()

        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True, padx=8, pady=(4, 8))

        self.calc_tab = ttk.Frame(nb, style="Body.TFrame")
        self.ref_tab = ttk.Frame(nb, style="Body.TFrame")
        nb.add(self.calc_tab, text="  Calculator  ")
        nb.add(self.ref_tab, text="  Reference Tables  ")

        self._build_calculator(self.calc_tab)
        self._build_reference(self.ref_tab)

        self._on_type_change()
        self.calculate()

    # ---- styling -------------------------------------------------------- #
    def _init_style(self):
        st = ttk.Style(self)
        try:
            st.theme_use("clam")
        except tk.TclError:
            pass
        st.configure("Body.TFrame", background=BODY_BG)
        st.configure("Panel.TFrame", background=CARD_BG)
        st.configure("TLabelframe", background=CARD_BG, borderwidth=1,
                     relief="solid", bordercolor="#C9D3E4")
        st.configure("TLabelframe.Label", background=CARD_BG,
                     foreground=NAVY, font=("Segoe UI Semibold", 10))
        st.configure("TLabel", background=CARD_BG, foreground=TEXT_DARK,
                     font=("Segoe UI", 9))
        st.configure("Muted.TLabel", background=CARD_BG, foreground=TEXT_MUTED,
                     font=("Segoe UI", 8))
        st.configure("Field.TLabel", background=CARD_BG, foreground=TEXT_MUTED,
                     font=("Segoe UI Semibold", 8))
        st.configure("Result.TLabel", background=CARD_BG, foreground=NAVY,
                     font=("Segoe UI Semibold", 10))
        st.configure("Big.TLabel", background=CARD_BG, foreground=NAVY,
                     font=("Segoe UI", 16, "bold"))
        st.configure("TButton", font=("Segoe UI Semibold", 10))
        st.configure("Accent.TButton", font=("Segoe UI Semibold", 11),
                     foreground="#FFFFFF")
        st.map("Accent.TButton",
               background=[("!disabled", NAVY), ("active", NAVY_LIGHT)])
        st.configure("TCombobox", fieldbackground=FIELD_BG)
        st.configure("Treeview.Heading", font=("Segoe UI Semibold", 9),
                     foreground=NAVY)
        st.configure("Treeview", font=("Segoe UI", 9), rowheight=22)

    def _build_header(self):
        head = tk.Frame(self, bg=NAVY, height=64)
        head.pack(fill="x", side="top")
        head.pack_propagate(False)
        tk.Label(head, text="\U0001F3DB",  # classical building emoji
                 bg=NAVY, fg=GOLD, font=("Segoe UI", 22)).pack(side="left", padx=(16, 8))
        box = tk.Frame(head, bg=NAVY)
        box.pack(side="left", pady=8)
        tk.Label(box, text="Hosapete Zonal Regulations  —  Building Parameter Calculator",
                 bg=NAVY, fg="#FFFFFF",
                 font=("Segoe UI Semibold", 15)).pack(anchor="w")
        tk.Label(box, text="As per Hospet Local Planning Area Master Plan (Revision-1)",
                 bg=NAVY, fg="#AEBBD4", font=("Segoe UI", 9)).pack(anchor="w")
        tk.Label(head, text="  All dimensions in Metres (m)  ", bg=GOLD, fg=NAVY,
                 font=("Segoe UI Semibold", 9)).pack(side="right", padx=16)

    # ---- calculator tab ------------------------------------------------- #
    def _build_calculator(self, parent):
        parent.columnconfigure(0, weight=0, minsize=330)
        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(0, weight=1)

        # --- LEFT : inputs (scrollable) --- #
        left = ttk.Frame(parent, style="Body.TFrame")
        left.grid(row=0, column=0, sticky="nsew", padx=(4, 4), pady=4)
        self._build_inputs(left)

        # --- RIGHT : results (scrollable) --- #
        right_wrap = ttk.Frame(parent, style="Body.TFrame")
        right_wrap.grid(row=0, column=1, sticky="nsew", padx=(4, 4), pady=4)
        right_wrap.rowconfigure(0, weight=1)
        right_wrap.columnconfigure(0, weight=1)

        canvas = tk.Canvas(right_wrap, bg=BODY_BG, highlightthickness=0)
        vsb = ttk.Scrollbar(right_wrap, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vsb.set)
        canvas.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")

        self.results_frame = ttk.Frame(canvas, style="Body.TFrame")
        win = canvas.create_window((0, 0), window=self.results_frame, anchor="nw")

        def _resize(event):
            canvas.itemconfig(win, width=event.width)
        canvas.bind("<Configure>", _resize)
        self.results_frame.bind(
            "<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))

        def _wheel(e):
            canvas.yview_scroll(int(-e.delta / 120), "units")
        canvas.bind_all("<MouseWheel>", _wheel)

        self._build_results(self.results_frame)

    def _add_field(self, parent, label, var, row, kind="entry", values=None,
                   command=None):
        ttk.Label(parent, text=label, style="Field.TLabel").grid(
            row=row, column=0, sticky="w", padx=10, pady=(6, 0))
        if kind == "entry":
            w = ttk.Entry(parent, textvariable=var, width=22)
        else:
            w = ttk.Combobox(parent, textvariable=var, values=values,
                             state="readonly", width=30)
            if command:
                w.bind("<<ComboboxSelected>>", command)
        w.grid(row=row + 1, column=0, sticky="ew", padx=10, pady=(0, 2))
        return w

    def _build_inputs(self, parent):
        parent.columnconfigure(0, weight=1)

        lf = ttk.LabelFrame(parent, text="  1.  INPUTS  ")
        lf.grid(row=0, column=0, sticky="nsew")
        lf.columnconfigure(0, weight=1)

        self.var_zone = tk.StringVar(value="Residential")
        self.var_btype = tk.StringVar(value="Residential building (single unit)")
        self.var_width = tk.StringVar(value="15")
        self.var_depth = tk.StringVar(value="20")
        self.var_area = tk.StringVar(value="")
        self.var_road_f = tk.StringVar(value="12")
        self.var_road_r = tk.StringVar(value="0")
        self.var_road_l = tk.StringVar(value="0")
        self.var_road_rt = tk.StringVar(value="0")
        self.var_roadclass = tk.StringVar(value="Other / local road (no building line)")
        self.var_ten = tk.StringVar(value="1")
        self.var_qty = tk.StringVar(value="0")

        r = 0
        self._add_field(lf, "1.1  Zone", self.var_zone, r, "combo",
                        values=ZONES, command=self._on_type_change); r += 2
        self._add_field(lf, "1.2  Building / Use type", self.var_btype, r, "combo",
                        values=list(BUILDING_TYPES.keys()),
                        command=self._on_type_change); r += 2

        # Dimensions
        ttk.Label(lf, text="1.3  Plot / Site dimensions", style="Field.TLabel").grid(
            row=r, column=0, sticky="w", padx=10, pady=(8, 0)); r += 1
        dim = ttk.Frame(lf, style="Panel.TFrame")
        dim.grid(row=r, column=0, sticky="ew", padx=6); r += 1
        dim.columnconfigure((0, 1), weight=1)
        ttk.Label(dim, text="Frontage / Width (m)", style="Muted.TLabel").grid(
            row=0, column=0, sticky="w", padx=4)
        ttk.Label(dim, text="Depth (m)", style="Muted.TLabel").grid(
            row=0, column=1, sticky="w", padx=4)
        ttk.Entry(dim, textvariable=self.var_width, width=12).grid(
            row=1, column=0, sticky="ew", padx=4, pady=2)
        ttk.Entry(dim, textvariable=self.var_depth, width=12).grid(
            row=1, column=1, sticky="ew", padx=4, pady=2)

        self._add_field(lf, "     Plot area (sqm)  -  blank = W x D", self.var_area, r)
        r += 2

        # Road widths
        ttk.Label(lf, text="1.4  Abutting road widths (m)", style="Field.TLabel").grid(
            row=r, column=0, sticky="w", padx=10, pady=(8, 0)); r += 1
        roads = ttk.Frame(lf, style="Panel.TFrame")
        roads.grid(row=r, column=0, sticky="ew", padx=6); r += 1
        roads.columnconfigure((0, 1), weight=1)
        for i, (txt, v) in enumerate([("Front road", self.var_road_f),
                                      ("Rear road", self.var_road_r),
                                      ("Left road", self.var_road_l),
                                      ("Right road", self.var_road_rt)]):
            rr, cc = divmod(i, 2)
            cell = ttk.Frame(roads, style="Panel.TFrame")
            cell.grid(row=rr, column=cc, sticky="ew", padx=4, pady=2)
            cell.columnconfigure(0, weight=1)
            ttk.Label(cell, text=txt, style="Muted.TLabel").grid(row=0, column=0, sticky="w")
            ttk.Entry(cell, textvariable=v, width=10).grid(row=1, column=0, sticky="ew")

        self._add_field(lf, "1.5  Road class for building line (Table 18)",
                        self.var_roadclass, r, "combo",
                        values=list(BUILDING_LINE.keys())); r += 2

        # Parking context
        ttk.Label(lf, text="1.6  Parking basis (Table 11)", style="Field.TLabel").grid(
            row=r, column=0, sticky="w", padx=10, pady=(8, 0)); r += 1
        self.ten_label = ttk.Label(lf, text="Number of tenements / units",
                                   style="Muted.TLabel")
        self.ten_label.grid(row=r, column=0, sticky="w", padx=10); r += 1
        self.ten_entry = ttk.Entry(lf, textvariable=self.var_ten, width=22)
        self.ten_entry.grid(row=r, column=0, sticky="ew", padx=10, pady=(0, 2)); r += 1
        self.qty_label = ttk.Label(lf, text="Parking basis value",
                                   style="Muted.TLabel")
        self.qty_label.grid(row=r, column=0, sticky="w", padx=10); r += 1
        self.qty_entry = ttk.Entry(lf, textvariable=self.var_qty, width=22)
        self.qty_entry.grid(row=r, column=0, sticky="ew", padx=10, pady=(0, 4)); r += 1

        ttk.Button(lf, text="CALCULATE", style="Accent.TButton",
                   command=self.calculate).grid(
            row=r, column=0, sticky="ew", padx=10, pady=10); r += 1

        # Disclaimer
        disc = tk.Frame(lf, bg="#FCEDED")
        disc.grid(row=r, column=0, sticky="ew", padx=10, pady=(0, 10))
        tk.Label(disc, text="⚠  Disclaimer", bg="#FCEDED", fg="#B02A2A",
                 font=("Segoe UI Semibold", 8)).pack(anchor="w", padx=6, pady=(4, 0))
        tk.Label(disc, text="Reference tool only. Verify all values against the "
                            "official Hosapete Master Plan (Revision-1) Zonal "
                            "Regulations before statutory use.",
                 bg="#FCEDED", fg="#7A3A3A", font=("Segoe UI", 8),
                 wraplength=280, justify="left").pack(anchor="w", padx=6, pady=(0, 6))

    def _build_results(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.columnconfigure(1, weight=1)

        # ---- Summary ---- #
        summ = ttk.LabelFrame(parent, text="  2.  SUMMARY OF RESULTS  ")
        summ.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 6))
        for i in range(4):
            summ.columnconfigure(i, weight=1)
        self.sum_widgets = {}
        for i, key in enumerate(["Plot Area (sqm)", "Permissible FAR",
                                 "Max Built-up (sqm)", "Ground Coverage"]):
            cell = ttk.Frame(summ, style="Panel.TFrame")
            cell.grid(row=0, column=i, sticky="nsew", padx=6, pady=8)
            ttk.Label(cell, text=key, style="Muted.TLabel").pack(anchor="w")
            val = ttk.Label(cell, text="-", style="Big.TLabel")
            val.pack(anchor="w")
            sub = ttk.Label(cell, text="", style="Muted.TLabel")
            sub.pack(anchor="w")
            self.sum_widgets[key] = (val, sub)

        # ---- Site diagram ---- #
        diag = ttk.LabelFrame(parent, text="  3.  SITE DIAGRAM (setbacks & buildable area)  ")
        diag.grid(row=1, column=0, columnspan=2, sticky="ew", pady=6)
        self.canvas = tk.Canvas(diag, height=300, bg=CARD_BG, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True, padx=8, pady=8)

        # ---- Setbacks ---- #
        self.setback_lf = ttk.LabelFrame(parent, text="  4.  SETBACKS (Table 1)  ")
        self.setback_lf.grid(row=2, column=0, columnspan=2, sticky="ew", pady=6)
        cols = ("side", "road", "setback")
        self.tv_setback = ttk.Treeview(self.setback_lf, columns=cols,
                                       show="headings", height=4)
        for c, t, w in [("side", "Side", 120), ("road", "Applicable Road Width (m)", 200),
                        ("setback", "Setback Required (m)", 180)]:
            self.tv_setback.heading(c, text=t)
            self.tv_setback.column(c, width=w, anchor="center")
        self.tv_setback.pack(fill="x", padx=8, pady=8)

        # ---- FAR & coverage + building line ---- #
        fc = ttk.LabelFrame(parent, text="  5.  FAR & GROUND COVERAGE  ")
        fc.grid(row=3, column=0, sticky="nsew", padx=(0, 4), pady=6)
        self.fc_body = ttk.Frame(fc, style="Panel.TFrame")
        self.fc_body.pack(fill="both", expand=True, padx=8, pady=6)

        bl = ttk.LabelFrame(parent, text="  6.  RESTRICTED BUILDING LINE (Table 18)  ")
        bl.grid(row=3, column=1, sticky="nsew", padx=(4, 0), pady=6)
        self.bl_body = ttk.Frame(bl, style="Panel.TFrame")
        self.bl_body.pack(fill="both", expand=True, padx=8, pady=6)

        # ---- corridor + parking ---- #
        cor = ttk.LabelFrame(parent, text="  7.  CORRIDOR WIDTH (Table 12)  ")
        cor.grid(row=4, column=0, sticky="nsew", padx=(0, 4), pady=6)
        self.cor_body = ttk.Frame(cor, style="Panel.TFrame")
        self.cor_body.pack(fill="both", expand=True, padx=8, pady=6)

        park = ttk.LabelFrame(parent, text="  8.  PARKING REQUIREMENT (Table 11)  ")
        park.grid(row=4, column=1, sticky="nsew", padx=(4, 0), pady=6)
        self.park_body = ttk.Frame(park, style="Panel.TFrame")
        self.park_body.pack(fill="both", expand=True, padx=8, pady=6)

    # ---- reference tab -------------------------------------------------- #
    def _build_reference(self, parent):
        nb = ttk.Notebook(parent)
        nb.pack(fill="both", expand=True, padx=6, pady=6)

        # Table 1
        f1 = ttk.Frame(nb, style="Body.TFrame"); nb.add(f1, text=" Table 1 - Setbacks ")
        cols = ("band", "rf", "rr", "cf", "cr", "pf", "pr")
        tv = ttk.Treeview(f1, columns=cols, show="headings")
        heads = [("band", "Depth of site (m)", 150), ("rf", "Res. Front", 80),
                 ("rr", "Res. Rear", 80), ("cf", "Com. Front", 80),
                 ("cr", "Com. Rear", 80), ("pf", "P&SP Front", 90),
                 ("pr", "P&SP Rear", 90)]
        for c, t, w in heads:
            tv.heading(c, text=t); tv.column(c, width=w, anchor="center")
        for i, lbl in enumerate(BAND_LABELS):
            tv.insert("", "end", values=(
                lbl, TABLE_1["Residential"]["front"][i], TABLE_1["Residential"]["rear"][i],
                TABLE_1["Commercial"]["front"][i], TABLE_1["Commercial"]["rear"][i],
                TABLE_1["Public & Semi-Public"]["front"][i],
                TABLE_1["Public & Semi-Public"]["rear"][i]))
        tv.pack(fill="both", expand=True, padx=6, pady=6)

        # Table 11
        f2 = ttk.Frame(nb, style="Body.TFrame"); nb.add(f2, text=" Table 11 - Parking ")
        tv2 = ttk.Treeview(f2, columns=("occ", "req"), show="headings")
        tv2.heading("occ", text="Occupancy"); tv2.column("occ", width=260, anchor="w")
        tv2.heading("req", text="Minimum parking requirement")
        tv2.column("req", width=520, anchor="w")
        park_rows = [
            ("Multi-family residential", "1 car / 2 tenements (75-150 sqm); >150 sqm -> 1 car/tenement"),
            ("Lodging / Tourist home", "1 car per 8 guest rooms"),
            ("Educational", "1 car per 200 sqm of office + public service areas"),
            ("Hospital", "1 car per 15 beds (min 195 sqm)"),
            ("Nursing home", "1 car per 7 beds (min 195 sqm)"),
            ("Assembly / Auditorium / Cinema", "1 car per 50 seats"),
            ("Government / Semi-public", "1 car per 150 sqm carpet area"),
            ("Retail business", "1 car per 100 sqm carpet area (<=100 sqm: none)"),
            ("Industrial", "1 car per 200 sqm carpet area"),
            ("Storage", "1 per 100 sqm up to 500 sqm, then 1 per 200 sqm"),
            ("Kalyana Mantapa", "1 car per 30 sqm of auditorium floor area"),
            ("Office building", "1 car per 100 sqm floor area"),
            ("Restaurant / Food & beverage", "1 car per 75 sqm floor area"),
            ("Hostel", "1 car per 15 rooms"),
        ]
        for occ, req in park_rows:
            tv2.insert("", "end", values=(occ, req))
        tv2.pack(fill="both", expand=True, padx=6, pady=6)

        # Table 12
        f3 = ttk.Frame(nb, style="Body.TFrame"); nb.add(f3, text=" Table 12 - Corridor ")
        tv3 = ttk.Treeview(f3, columns=("use", "w"), show="headings")
        tv3.heading("use", text="Building use / type"); tv3.column("use", width=420, anchor="w")
        tv3.heading("w", text="Min corridor width (m)"); tv3.column("w", width=180, anchor="center")
        for use, w in CORRIDOR.items():
            tv3.insert("", "end", values=(use, f"{w:.2f}"))
        tv3.pack(fill="both", expand=True, padx=6, pady=6)

        # Table 18
        f4 = ttk.Frame(nb, style="Body.TFrame"); nb.add(f4, text=" Table 18 - Building line ")
        tv4 = ttk.Treeview(f4, columns=("road", "bl"), show="headings")
        tv4.heading("road", text="Name of the road"); tv4.column("road", width=420, anchor="w")
        tv4.heading("bl", text="Building line from centre of road (m)")
        tv4.column("bl", width=260, anchor="center")
        for road, bl in BUILDING_LINE.items():
            tv4.insert("", "end", values=(road, "-" if bl is None else f"{bl:.2f}"))
        tv4.pack(fill="both", expand=True, padx=6, pady=6)

    # ---- dynamic parking labels ---------------------------------------- #
    def _on_type_change(self, *_):
        meta = BUILDING_TYPES.get(self.var_btype.get())
        if not meta:
            return
        # tenements only for residential multi-family
        if meta["tenement"]:
            self.ten_label.configure(text="Number of tenements / units")
            self.ten_entry.configure(state="normal")
        else:
            self.ten_label.configure(text="Number of tenements / units (n/a)")
            self.ten_entry.configure(state="disabled")
        if meta["qty"]:
            self.qty_label.configure(text=meta["qty"])
            self.qty_entry.configure(state="normal")
        else:
            self.qty_label.configure(text="Parking basis value (n/a)")
            self.qty_entry.configure(state="disabled")

    # ---- helpers -------------------------------------------------------- #
    @staticmethod
    def _f(var, default=0.0):
        try:
            s = var.get().strip()
            return float(s) if s else default
        except (ValueError, AttributeError):
            return default

    # ---- the calculation ----------------------------------------------- #
    def calculate(self):
        zone = self.var_zone.get()
        btype = self.var_btype.get()
        meta = BUILDING_TYPES[btype]

        width = self._f(self.var_width)
        depth = self._f(self.var_depth)
        if width <= 0 or depth <= 0:
            messagebox.showwarning("Input required",
                                   "Please enter a valid site width and depth.")
            return
        area = self._f(self.var_area)
        if area <= 0:
            area = width * depth

        roads = [self._f(self.var_road_f), self._f(self.var_road_r),
                 self._f(self.var_road_l), self._f(self.var_road_rt)]
        front_road = roads[0]
        # FAR & height governed by the WIDER abutting road.
        det_road = max(roads) if max(roads) > 0 else front_road

        # ---- setbacks ---- #
        sb = setbacks_for(zone, depth, width, area)

        # ---- building line (Table 18) ---- #
        bl_val = BUILDING_LINE.get(self.var_roadclass.get())
        bl_from_boundary = None
        if bl_val is not None and front_road > 0:
            bl_from_boundary = max(0.0, bl_val - front_road / 2.0)
        # Front setback must respect building line if larger.
        front_setback = sb["front"]
        if bl_from_boundary is not None:
            front_setback = max(front_setback, bl_from_boundary)

        # ---- FAR & coverage ---- #
        far, cov = far_and_coverage(zone, area, det_road)
        max_builtup = far * area
        max_ground = cov * area

        # ---- buildable envelope ---- #
        b_w = max(0.0, width - sb["left"] - sb["right"])
        b_d = max(0.0, depth - front_setback - sb["rear"])
        envelope = b_w * b_d
        ground_used = min(envelope, max_ground)

        # ---- corridor ---- #
        corridor = CORRIDOR[meta["corridor"]]

        # ---- parking ---- #
        ctx = dict(tenements=int(self._f(self.var_ten)),
                   qty=self._f(self.var_qty))
        cars, park_basis = parking_required(meta["park"], ctx)
        two_wheel = int(math.ceil(cars * 0.25))

        # ================= update UI ================= #
        self._update_summary(area, far, max_builtup, cov, max_ground)
        self._update_setbacks(sb, front_setback, front_road, roads)
        self._update_fc(far, det_road, cov, max_builtup, max_ground)
        self._update_bl(bl_val, bl_from_boundary, front_setback, front_road)
        self._update_corridor(meta["corridor"], corridor)
        self._update_parking(cars, two_wheel, park_basis)
        self._draw_diagram(width, depth, front_setback, sb["rear"],
                           sb["left"], sb["right"], b_w, b_d, envelope)

    # ---- UI update helpers --------------------------------------------- #
    def _update_summary(self, area, far, builtup, cov, ground):
        v, s = self.sum_widgets["Plot Area (sqm)"]
        v.configure(text=f"{area:,.2f}"); s.configure(text="")
        v, s = self.sum_widgets["Permissible FAR"]
        v.configure(text=f"{far:.2f}"); s.configure(text="")
        v, s = self.sum_widgets["Max Built-up (sqm)"]
        v.configure(text=f"{builtup:,.2f}"); s.configure(text=f"FAR {far:.2f} x area")
        v, s = self.sum_widgets["Ground Coverage"]
        v.configure(text=f"{cov*100:.0f} %"); s.configure(text=f"({ground:,.2f} sqm)")

    def _update_setbacks(self, sb, front_setback, front_road, roads):
        for it in self.tv_setback.get_children():
            self.tv_setback.delete(it)
        rows = [
            ("Front", f"{front_road:.2f}" if front_road else "-", f"{front_setback:.2f}"),
            ("Rear", f"{roads[1]:.2f}" if roads[1] else "-", f"{sb['rear']:.2f}"),
            ("Left side", f"{roads[2]:.2f}" if roads[2] else "-", f"{sb['left']:.2f}"),
            ("Right side", f"{roads[3]:.2f}" if roads[3] else "-", f"{sb['right']:.2f}"),
        ]
        for row in rows:
            self.tv_setback.insert("", "end", values=row)

    def _clear(self, frame):
        for w in frame.winfo_children():
            w.destroy()

    def _kv(self, frame, k, val, r, big=False):
        ttk.Label(frame, text=k, style="Muted.TLabel").grid(
            row=r, column=0, sticky="w", pady=2)
        ttk.Label(frame, text=val,
                  style="Big.TLabel" if big else "Result.TLabel").grid(
            row=r, column=1, sticky="e", pady=2)

    def _update_fc(self, far, road, cov, builtup, ground):
        self._clear(self.fc_body)
        self.fc_body.columnconfigure(1, weight=1)
        self._kv(self.fc_body, "Permissible FAR (road-governed)", f"{far:.2f}", 0)
        self._kv(self.fc_body, "Determining road width", f"{road:.2f} m", 1)
        self._kv(self.fc_body, "Max built-up area", f"{builtup:,.2f} sqm", 2)
        self._kv(self.fc_body, "Max ground coverage", f"{cov*100:.0f} %", 3)
        self._kv(self.fc_body, "Max coverage area", f"{ground:,.2f} sqm", 4)

    def _update_bl(self, bl_val, bl_boundary, front_setback, front_road):
        self._clear(self.bl_body)
        self.bl_body.columnconfigure(1, weight=1)
        if bl_val is None:
            self._kv(self.bl_body, "Building line (Table 18)", "Not applicable", 0)
            self._kv(self.bl_body, "Restricted building line (front setback)",
                     f"{front_setback:.2f} m", 1, big=True)
            ttk.Label(self.bl_body, text="Front setback governed by Table 1.",
                      style="Muted.TLabel").grid(row=2, column=0, columnspan=2,
                                                 sticky="w", pady=(4, 0))
        else:
            self._kv(self.bl_body, "Building line from road centre", f"{bl_val:.2f} m", 0)
            self._kv(self.bl_body, "Front road width", f"{front_road:.2f} m", 1)
            self._kv(self.bl_body, "= Line from plot boundary",
                     f"{bl_boundary:.2f} m" if bl_boundary is not None else "-", 2)
            self._kv(self.bl_body, "Restricted building line (front setback)",
                     f"{front_setback:.2f} m", 3, big=True)

    def _update_corridor(self, cat, width):
        self._clear(self.cor_body)
        self.cor_body.columnconfigure(1, weight=1)
        self._kv(self.cor_body, "Building use category", cat, 0)
        self._kv(self.cor_body, "Minimum corridor width", f"{width:.2f} m", 1, big=True)

    def _update_parking(self, cars, two_wheel, basis):
        self._clear(self.park_body)
        self.park_body.columnconfigure(1, weight=1)
        self._kv(self.park_body, "Car spaces required",
                 f"{cars}  ({CAR_W:.2f} m x {CAR_L:.2f} m)", 0, big=True)
        self._kv(self.park_body, "Two-wheeler (25% of cars)", f"{two_wheel}", 1)
        ttk.Label(self.park_body, text="Basis:  " + basis, style="Muted.TLabel",
                  wraplength=360, justify="left").grid(
            row=2, column=0, columnspan=2, sticky="w", pady=(4, 0))

    # ---- site diagram --------------------------------------------------- #
    def _draw_diagram(self, W, D, front, rear, left, right, bw, bd, envelope):
        c = self.canvas
        c.delete("all")
        c.update_idletasks()
        cw = c.winfo_width() or 700
        ch = 300
        margin = 70
        avail_w = cw - 2 * margin
        avail_h = ch - 2 * margin
        if W <= 0 or D <= 0:
            return
        scale = min(avail_w / W, avail_h / D)
        pw, pd = W * scale, D * scale
        x0 = (cw - pw) / 2
        y0 = (ch - pd) / 2

        # plot boundary
        c.create_rectangle(x0, y0, x0 + pw, y0 + pd, fill="#EDEFF4",
                           outline="#334", width=2)

        # buildable rectangle
        bx0 = x0 + left * scale
        by0 = y0 + front * scale
        bx1 = x0 + pw - right * scale
        by1 = y0 + pd - rear * scale
        if bx1 > bx0 and by1 > by0:
            c.create_rectangle(bx0, by0, bx1, by1, fill=GREEN_FILL,
                               outline=GREEN_LINE, width=2)
            c.create_rectangle(bx0, by0, bx1, by1, outline=RED_DASH, dash=(4, 3))
            c.create_text((bx0 + bx1) / 2, (by0 + by1) / 2 - 12,
                          text="Buildable area", fill=NAVY,
                          font=("Segoe UI Semibold", 9))
            c.create_text((bx0 + bx1) / 2, (by0 + by1) / 2 + 4,
                          text=f"{bw:.2f} m x {bd:.2f} m", fill=NAVY,
                          font=("Segoe UI", 9))
            c.create_text((bx0 + bx1) / 2, (by0 + by1) / 2 + 20,
                          text=f"= {envelope:.2f} sqm", fill=TEXT_MUTED,
                          font=("Segoe UI", 8))

        # setback labels
        mid_x = (x0 + x0 + pw) / 2
        mid_y = (y0 + y0 + pd) / 2
        c.create_text(mid_x, y0 - 22, text=f"Front setback  {front:.2f} m",
                      fill=NAVY, font=("Segoe UI", 8))
        c.create_text(mid_x, y0 + pd + 22, text=f"Rear setback  {rear:.2f} m",
                      fill=NAVY, font=("Segoe UI", 8))
        c.create_text(x0 - 40, mid_y, text=f"Left\n{left:.2f} m",
                      fill=NAVY, font=("Segoe UI", 8), justify="center")
        c.create_text(x0 + pw + 42, mid_y, text=f"Right\n{right:.2f} m",
                      fill=NAVY, font=("Segoe UI", 8), justify="center")
        # plot dimensions
        c.create_text(mid_x, y0 + pd + 42, text=f"Width  {W:.2f} m",
                      fill=TEXT_MUTED, font=("Segoe UI Semibold", 8))
        c.create_text(x0 + pw + 42, y0 + pd / 2 - 30, text=f"Depth\n{D:.2f} m",
                      fill=TEXT_MUTED, font=("Segoe UI Semibold", 8), justify="center")


if __name__ == "__main__":
    app = ZoningApp()
    app.mainloop()
