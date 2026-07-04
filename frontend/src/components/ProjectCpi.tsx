import {
  Accordion,
  AccordionItem,
  Button,
  Checkbox,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  Slider,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import {
  CPI_REPORT_FIELDS,
  CPI_SECTIONS,
  type CpiReport,
  type CpiSectionId,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";

/**
 * Client–Project Intelligence (CPI) — residential onboarding & program
 * formulation questionnaire (21 sections). Uncovers how the client lives,
 * thinks, decides and emotionally connects with spaces; the deliverable is
 * the synthesized Client Intelligence Report (Section 21), drafted by ESTI
 * from the saved responses and reviewed by the architect.
 *
 * Data model: answers live per-section as a flat Record keyed by question id;
 * the field definitions below drive rendering (text / textarea / rating 1–5 /
 * scale 1–10 / single choice / multi choice / rank).
 */

type Field =
  | { kind: "text"; id: string; label: string }
  | { kind: "textarea"; id: string; label: string }
  | { kind: "rating"; id: string; label: string } // 1–5
  | { kind: "scale"; id: string; label: string; min?: number; max?: number } // slider
  | { kind: "single"; id: string; label: string; options: readonly string[] }
  | { kind: "multi"; id: string; label: string; options: readonly string[]; max?: number }
  | { kind: "rank"; id: string; label: string; items: readonly string[] };

type SectionDef = { id: CpiSectionId; intro?: string; fields: Field[] };

const RATE_5 = (id: string, label: string): Field => ({ kind: "rating", id, label });

const SECTION_DEFS: SectionDef[] = [
  {
    id: "aboutYou",
    intro: "Who are the people this home is being designed for?",
    fields: [
      { kind: "textarea", id: "familyMembers", label: "Family members and ages" },
      { kind: "text", id: "occupations", label: "Occupations" },
      { kind: "textarea", id: "dailySchedules", label: "Daily schedules" },
      { kind: "text", id: "pets", label: "Pets" },
      { kind: "text", id: "frequentGuests", label: "Frequent guests" },
      { kind: "text", id: "domesticHelp", label: "Domestic help" },
      { kind: "text", id: "accessibility", label: "Elderly or accessibility requirements" },
      { kind: "textarea", id: "futurePlans", label: "Future family plans (5–10 years)" },
    ],
  },
  {
    id: "currentHome",
    fields: [
      { kind: "textarea", id: "love", label: "What do you love about your current home?" },
      { kind: "textarea", id: "frustrates", label: "What frustrates you every day?" },
      { kind: "text", id: "mostUsedRoom", label: "Which room do you spend the most time in?" },
      { kind: "text", id: "avoidedRoom", label: "Which room do you avoid?" },
      {
        kind: "textarea",
        id: "promise",
        label: "What have you promised yourself your next home will definitely have?",
      },
    ],
  },
  {
    id: "dailyLife",
    intro: "Walk us through a typical weekday.",
    fields: [
      { kind: "textarea", id: "morningRoutine", label: "Morning routine" },
      { kind: "textarea", id: "workRoutine", label: "Work routine" },
      { kind: "textarea", id: "eveningRoutine", label: "Evening routine" },
      { kind: "textarea", id: "weekendRoutine", label: "Weekend routine" },
      { kind: "text", id: "wakesFirst", label: "Who wakes up first?" },
      { kind: "text", id: "coffeeSpot", label: "Where do you drink coffee?" },
      { kind: "text", id: "childrenStudy", label: "Where do children study?" },
      { kind: "text", id: "entertainFrequency", label: "How often do you entertain?" },
      { kind: "text", id: "visitorCount", label: "How many people usually visit?" },
      { kind: "single", id: "cookDaily", label: "Do you cook daily?", options: ["Yes", "No"] },
      { kind: "single", id: "orderFood", label: "Do you order food often?", options: ["Yes", "No"] },
      { kind: "text", id: "storageNeeds", label: "How much storage do you need?" },
      { kind: "single", id: "workFromHome", label: "Do you work from home?", options: ["Yes", "No", "Sometimes"] },
    ],
  },
  {
    id: "lifestyleProfile",
    intro: "Rate from 1–5.",
    fields: [
      RATE_5("quietHome", "I like a quiet home"),
      RATE_5("entertaining", "I love entertaining guests"),
      RATE_5("openSpaces", "I prefer open spaces"),
      RATE_5("privacy", "I need privacy"),
      RATE_5("naturalLight", "I love natural light"),
      RATE_5("collectingArt", "I enjoy collecting art"),
      RATE_5("decorativeObjects", "I buy many decorative objects"),
      RATE_5("dislikeClutter", "I dislike clutter"),
      RATE_5("cooking", "I enjoy cooking"),
      RATE_5("technology", "Technology is important"),
      RATE_5("sustainability", "Sustainability matters"),
      RATE_5("lowMaintenance", "Maintenance should be minimal"),
    ],
  },
  {
    id: "emotionalGoals",
    intro: "When someone enters your home — how should they feel? Choose up to five.",
    fields: [
      {
        kind: "multi",
        id: "feelings",
        label: "Feelings",
        max: 5,
        options: [
          "Calm", "Luxurious", "Warm", "Elegant", "Minimal", "Cozy", "Grand",
          "Sophisticated", "Artistic", "Natural", "Bold", "Peaceful", "Energetic", "Timeless",
        ],
      },
    ],
  },
  {
    id: "designPersonality",
    intro: "Without thinking too much — choose one.",
    fields: [
      {
        kind: "single",
        id: "home",
        label: "Which home is you?",
        options: [
          "Home A — Simple, minimal, clean lines",
          "Home B — Warm, natural, textured",
          "Home C — Luxury hotel feeling",
          "Home D — Traditional craftsmanship",
          "Home E — Contemporary statement",
        ],
      },
    ],
  },
  {
    id: "aestheticIntelligence",
    fields: [
      {
        kind: "multi",
        id: "materials",
        label: "Which materials naturally attract you?",
        options: ["Marble", "Travertine", "Wood", "Concrete", "Metal", "Glass", "Brick", "Lime plaster", "Stone"],
      },
      {
        kind: "multi",
        id: "finishes",
        label: "Which finishes do you prefer?",
        options: ["Matte", "Satin", "Gloss", "Textured", "Rough", "Smooth"],
      },
      {
        kind: "multi",
        id: "dreamWords",
        label: "Which words describe your dream home? (choose 10)",
        max: 10,
        options: [
          "Calm", "Luxury", "Simple", "Organic", "Earthy", "Elegant", "Soft", "Bright", "Dark", "Moody",
          "Minimal", "Timeless", "Layered", "Artistic", "Modern", "Classic", "Warm", "Cold", "Bold", "Refined",
        ],
      },
    ],
  },
  {
    id: "colourIntelligence",
    intro: "Without naming colours — which environments make you happiest? (this indirectly reveals the palette)",
    fields: [
      {
        kind: "multi",
        id: "environments",
        label: "Environments",
        options: [
          "Forest", "Beach", "Desert", "Mountains", "Rain", "Snow", "City",
          "Countryside", "Historic town", "Luxury hotel",
        ],
      },
      { kind: "scale", id: "colourAmount", label: "How much colour do you enjoy? (neutral 1 → colourful 10)", min: 1, max: 10 },
      { kind: "text", id: "accentColours", label: "Preferred accent colours" },
      { kind: "text", id: "avoidedColours", label: "Avoided colours" },
      { kind: "text", id: "clothingColours", label: "Favourite clothing colours" },
      { kind: "text", id: "carColour", label: "Favourite car colour" },
      { kind: "text", id: "hotelInteriors", label: "Favourite hotel interiors" },
    ],
  },
  {
    id: "lightIntelligence",
    fields: [
      {
        kind: "multi",
        id: "preferences",
        label: "Do you prefer…",
        options: [
          "Bright daylight", "Soft daylight", "Dim mood lighting", "Warm lighting",
          "Cool lighting", "Indirect lighting", "Large windows", "Cozy corners",
        ],
      },
    ],
  },
  {
    id: "furnitureBehaviour",
    fields: [
      {
        kind: "multi",
        id: "preferences",
        label: "Do you prefer…",
        options: [
          "Few high-quality pieces", "Many decorative pieces", "Flexible furniture", "Built-in furniture",
          "Movable furniture", "Large sofas", "Formal seating", "Casual seating",
        ],
      },
    ],
  },
  {
    id: "textureIntelligence",
    intro: "Touch the samples and rate each 1–5.",
    fields: ["Wood", "Leather", "Linen", "Cotton", "Velvet", "Stone", "Concrete", "Brass", "Steel", "Glass"].map(
      (m) => RATE_5(m.toLowerCase(), m),
    ),
  },
  {
    id: "scaleIntelligence",
    fields: [
      {
        kind: "multi",
        id: "comfortable",
        label: "Which spaces feel comfortable?",
        options: [
          "Small intimate rooms", "Medium balanced rooms", "Large dramatic spaces", "Double-height ceilings",
          "Low ceilings", "Wide corridors", "Compact efficient planning",
        ],
      },
    ],
  },
  {
    id: "storageIntelligence",
    intro: "Rate each 1–5.",
    fields: [
      RATE_5("hiddenStorage", "Hidden storage"),
      RATE_5("displayShelving", "Display shelving"),
      RATE_5("walkInWardrobe", "Walk-in wardrobe"),
      RATE_5("pantry", "Pantry"),
      RATE_5("utilityRoom", "Utility room"),
      RATE_5("garageStorage", "Garage storage"),
      RATE_5("outdoorStorage", "Outdoor storage"),
    ],
  },
  {
    id: "kitchenIntelligence",
    fields: [
      { kind: "text", id: "whoCooks", label: "Who cooks?" },
      { kind: "text", id: "howOften", label: "How often?" },
      { kind: "text", id: "cuisine", label: "Cuisine" },
      { kind: "single", id: "heavyCooking", label: "Heavy cooking?", options: ["Yes", "No"] },
      { kind: "single", id: "spiceKitchen", label: "Separate spice kitchen?", options: ["Yes", "No"] },
      { kind: "single", id: "breakfastCounter", label: "Breakfast counter?", options: ["Yes", "No"] },
      { kind: "text", id: "diningFrequency", label: "Dining frequency?" },
    ],
  },
  {
    id: "bathroomIntelligence",
    fields: [
      { kind: "single", id: "spaFeeling", label: "Spa feeling?", options: ["Yes", "No"] },
      { kind: "single", id: "luxuryHotel", label: "Luxury hotel?", options: ["Yes", "No"] },
      { kind: "single", id: "easyMaintenance", label: "Easy maintenance?", options: ["Yes", "No"] },
      { kind: "single", id: "bathtub", label: "Bathtub?", options: ["Yes", "No"] },
      { kind: "single", id: "rainShower", label: "Rain shower?", options: ["Yes", "No"] },
      { kind: "single", id: "steamRoom", label: "Steam room?", options: ["Yes", "No"] },
    ],
  },
  {
    id: "technologyIntelligence",
    fields: [
      { kind: "single", id: "smartHome", label: "Smart home?", options: ["Yes", "No"] },
      { kind: "single", id: "voiceControl", label: "Voice control?", options: ["Yes", "No"] },
      { kind: "single", id: "automatedCurtains", label: "Automated curtains?", options: ["Yes", "No"] },
      { kind: "single", id: "security", label: "Security?", options: ["Yes", "No"] },
      { kind: "single", id: "solar", label: "Solar?", options: ["Yes", "No"] },
      { kind: "single", id: "homeTheatre", label: "Home theatre?", options: ["Yes", "No"] },
      { kind: "single", id: "evCharging", label: "EV charging?", options: ["Yes", "No"] },
    ],
  },
  {
    id: "sustainabilityIntelligence",
    intro: "Importance, 1–10.",
    fields: [
      { kind: "scale", id: "rainwaterHarvesting", label: "Rainwater harvesting", min: 1, max: 10 },
      { kind: "scale", id: "solar", label: "Solar", min: 1, max: 10 },
      { kind: "scale", id: "naturalVentilation", label: "Natural ventilation", min: 1, max: 10 },
      { kind: "scale", id: "lowVoc", label: "Low VOC materials", min: 1, max: 10 },
      { kind: "scale", id: "localMaterials", label: "Local materials", min: 1, max: 10 },
      { kind: "scale", id: "energyEfficiency", label: "Energy efficiency", min: 1, max: 10 },
    ],
  },
  {
    id: "budgetIntelligence",
    intro: "Rank the investment priorities (1 = highest).",
    fields: [
      {
        kind: "rank",
        id: "priorities",
        label: "Investment priorities",
        items: ["Kitchen", "Bathrooms", "Lighting", "Furniture", "Landscape", "Stone", "Wardrobes", "Automation", "Art"],
      },
    ],
  },
  {
    id: "projectPriorities",
    intro: "Rank the project priorities (1 = highest).",
    fields: [
      {
        kind: "rank",
        id: "priorities",
        label: "Project priorities",
        items: ["Beauty", "Function", "Longevity", "Budget", "Luxury", "Speed", "Sustainability", "Maintenance"],
      },
    ],
  },
  {
    id: "imageIntelligence",
    intro:
      "Run after the verbal questionnaire, with curated boards (20–30 images per category). Score each category's board 1–5 (1 = strongly dislike, 5 = love / must-have) and record what specifically appeals or repels — materials, lighting, proportions, colours, furniture, textures.",
    fields: [
      ...[
        "Living rooms", "Kitchens", "Bedrooms", "Bathrooms", "Staircases", "Dining rooms", "Home offices",
        "Outdoor spaces", "Facades", "Entry foyers", "Lighting", "Furniture", "Material palettes", "Flooring",
        "Ceiling designs", "Window styles", "Hardware", "Landscapes", "Art displays", "Storage solutions",
      ].map((c) => RATE_5(c.toLowerCase().replace(/\s+/g, "-"), c)),
      { kind: "textarea", id: "notes", label: "What specifically appeals or repels (per board)" },
    ],
  },
];

const SECTION_TITLE = new Map(CPI_SECTIONS.map((s) => [s.id, `${s.no} — ${s.title}`]));

type Answers = Record<string, unknown>;

function FieldControl({ field, value, onChange }: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const idBase = `cpi-${field.id}`;
  switch (field.kind) {
    case "text":
      return (
        <TextInput
          id={idBase}
          labelText={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return (
        <TextArea
          id={idBase}
          labelText={field.label}
          rows={2}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "rating":
      return (
        <RadioButtonGroup
          name={idBase}
          legendText={field.label}
          valueSelected={typeof value === "number" ? String(value) : undefined}
          onChange={(v) => onChange(Number(v))}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <RadioButton key={n} id={`${idBase}-${n}`} labelText={String(n)} value={String(n)} />
          ))}
        </RadioButtonGroup>
      );
    case "scale":
      return (
        <Slider
          id={idBase}
          labelText={field.label}
          min={field.min ?? 1}
          max={field.max ?? 10}
          step={1}
          value={typeof value === "number" ? value : Math.ceil(((field.min ?? 1) + (field.max ?? 10)) / 2)}
          onChange={({ value: v }) => onChange(v)}
        />
      );
    case "single":
      return (
        <RadioButtonGroup
          name={idBase}
          legendText={field.label}
          orientation={field.options.some((o) => o.length > 24) ? "vertical" : "horizontal"}
          valueSelected={typeof value === "string" ? value : undefined}
          onChange={(v) => onChange(String(v))}
        >
          {field.options.map((o) => (
            <RadioButton key={o} id={`${idBase}-${o}`} labelText={o} value={o} />
          ))}
        </RadioButtonGroup>
      );
    case "multi": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const limit = field.max;
      return (
        <fieldset>
          <legend className="esti-label esti-label--secondary">
            {field.label}
            {limit ? ` (${selected.length}/${limit})` : ""}
          </legend>
          {field.options.map((o) => {
            const checked = selected.includes(o);
            return (
              <Checkbox
                key={o}
                id={`${idBase}-${o}`}
                labelText={o}
                checked={checked}
                disabled={!checked && !!limit && selected.length >= limit}
                onChange={(_, { checked: on }) =>
                  onChange(on ? [...selected, o] : selected.filter((x) => x !== o))
                }
              />
            );
          })}
        </fieldset>
      );
    }
    case "rank": {
      const ranks = (value ?? {}) as Record<string, number>;
      return (
        <Stack gap={3}>
          <p className="esti-label esti-label--secondary">{field.label}</p>
          {field.items.map((item) => (
            <div key={item} className="esti-row-between">
              <span>{item}</span>
              <Select
                id={`${idBase}-${item}`}
                labelText=""
                hideLabel
                size="sm"
                className="esti-input-sm"
                value={ranks[item] != null ? String(ranks[item]) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = { ...ranks };
                  if (v === "") delete next[item];
                  else next[item] = Number(v);
                  onChange(next);
                }}
              >
                <SelectItem value="" text="—" />
                {field.items.map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)} text={String(i + 1)} />
                ))}
              </Select>
            </div>
          ))}
        </Stack>
      );
    }
  }
}

export function ProjectCpi({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const cpiQ = trpc.cpi.get.useQuery({ projectId });
  const generate = trpc.cpi.generateReport.useMutation({
    onSuccess: (res) => setReportDraft(res.report),
  });
  const saveReport = trpc.cpi.saveReport.useMutation({
    onSuccess: () => {
      setReportDraft(null);
      void utils.cpi.get.invalidate({ projectId });
    },
  });

  const [reportDraft, setReportDraft] = useState<CpiReport | null>(null);

  const row = cpiQ.data;
  const sections = (row?.sections ?? {}) as Record<string, Answers>;
  const savedReport = (row?.report ?? null) as CpiReport | null;
  const report = reportDraft ?? savedReport;
  const answeredCount = Object.keys(sections).length;

  if (!row) return null;

  return (
    <Stack gap={6}>
      <Tile className="esti-fill">
        <Stack gap={3}>
          <div className="esti-row-between">
            <h4>Client–Project Intelligence (CPI)</h4>
            <Tag type={row.status === "COMPLETE" ? "green" : "gray"} size="sm">
              {row.status === "COMPLETE" ? "Report saved" : `${answeredCount}/${SECTION_DEFS.length} sections`}
            </Tag>
          </div>
          <p className="esti-label esti-label--secondary">
            Residential onboarding & program formulation — uncovers how the client lives,
            thinks, decides and emotionally connects with spaces. The output is the Client
            Intelligence Report, the foundation of the design brief.
          </p>
        </Stack>
      </Tile>

      <Accordion>
        {SECTION_DEFS.map((def) => (
          <AccordionItem
            key={def.id}
            title={`${SECTION_TITLE.get(def.id) ?? def.id}${sections[def.id] ? " ✓" : ""}`}
          >
            <CpiSectionBody
              projectId={projectId}
              def={def}
              saved={sections[def.id] ?? {}}
              onSaved={() => void utils.cpi.get.invalidate({ projectId })}
            />
          </AccordionItem>
        ))}
        <AccordionItem title="21 — Designer's Intelligence Report" open={!!report}>
          <Stack gap={5}>
            <p className="esti-label esti-label--secondary">
              The CPI deliverable: not a completed questionnaire but a synthesized design
              brief. ESTI drafts it from the saved responses; review, edit and save.
            </p>
            <div className="esti-row">
              <Button
                size="sm"
                kind="tertiary"
                disabled={answeredCount === 0 || generate.isPending}
                onClick={() => generate.mutate({ projectId })}
              >
                {generate.isPending ? "ESTI is synthesizing…" : "Draft report with ESTI"}
              </Button>
            </div>
            {generate.isError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Could not draft the report"
                subtitle={generate.error.message}
              />
            )}
            {report && (
              <Stack gap={4}>
                {CPI_REPORT_FIELDS.map(({ key, label }) => (
                  <TextArea
                    key={key}
                    id={`cpi-report-${key}`}
                    labelText={label}
                    rows={key === "summary" ? 4 : 2}
                    value={report[key]}
                    onChange={(e) =>
                      setReportDraft({ ...(reportDraft ?? savedReport ?? report), [key]: e.target.value })
                    }
                  />
                ))}
                <div className="esti-row">
                  <Button
                    size="sm"
                    disabled={!reportDraft || saveReport.isPending}
                    onClick={() => reportDraft && saveReport.mutate({ projectId, report: reportDraft })}
                  >
                    Save report
                  </Button>
                  {savedReport && !reportDraft && <Tag type="green" size="sm">Saved</Tag>}
                </div>
                {saveReport.isError && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    hideCloseButton
                    title="Could not save the report"
                    subtitle={saveReport.error.message}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </AccordionItem>
      </Accordion>
    </Stack>
  );
}

/** Section body owning its local answers + save mutation. */
function CpiSectionBody({ projectId, def, saved, onSaved }: {
  projectId: string;
  def: SectionDef;
  saved: Answers;
  onSaved: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(saved);
  useEffect(() => setAnswers(saved), [saved]);
  const save = trpc.cpi.saveSection.useMutation({ onSuccess: onSaved });
  const dirty = JSON.stringify(answers) !== JSON.stringify(saved);
  const answered = Object.keys(saved).length > 0;

  return (
    <Stack gap={5}>
      {def.intro && <p className="esti-label esti-label--secondary">{def.intro}</p>}
      {def.fields.map((f) => (
        <FieldControl
          key={f.id}
          field={f}
          value={answers[f.id]}
          onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))}
        />
      ))}
      <div className="esti-row">
        <Button
          size="sm"
          kind={dirty ? "primary" : "tertiary"}
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ projectId, section: def.id, data: answers })}
        >
          Save section
        </Button>
        {answered && !dirty && <Tag type="green" size="sm">Saved</Tag>}
      </div>
      {save.isError && (
        <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={save.error.message} />
      )}
    </Stack>
  );
}
