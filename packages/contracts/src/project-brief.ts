import { z } from "zod";

export const BriefSpaceRow = z.object({
  code: z.string().max(32),
  title: z.string().max(200),
  areaSqm: z.number().nonnegative().optional(),
  floor: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
});
export type BriefSpaceRow = z.infer<typeof BriefSpaceRow>;

export const BriefRoomDetail = z.object({
  roomCode: z.string().max(32),
  ambience: z.string().max(500).optional(),
  lighting: z.string().max(500).optional(),
  flooring: z.string().max(500).optional(),
  furniture: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});
export type BriefRoomDetail = z.infer<typeof BriefRoomDetail>;

export const BriefBasicInfo = z.object({
  clientName: z.string().max(200).optional(),
  currentAddress: z.string().max(500).optional(),
  siteAddress: z.string().max(500).optional(),
  mobile: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  occupation: z.string().max(200).optional(),
  plotSize: z.string().max(200).optional(),
  terrain: z.string().max(200).optional(),
  vegetation: z.string().max(200).optional(),
  orientationNotes: z.string().max(2000).optional(),
});
export type BriefBasicInfo = z.infer<typeof BriefBasicInfo>;

export const BriefProjectInfo = z.object({
  intendedUse: z.string().max(500).optional(),
  builtUpAreaSqm: z.number().nonnegative().optional(),
  phasedConstruction: z.boolean().optional(),
  tentativeStart: z.string().date().optional(),
  budgetNote: z.string().max(500).optional(),
  financeNote: z.string().max(500).optional(),
});
export type BriefProjectInfo = z.infer<typeof BriefProjectInfo>;

export const BriefOccupants = z.object({
  household: z
    .array(
      z.object({
        name: z.string().max(120),
        relation: z.string().max(80).optional(),
        age: z.number().int().nonnegative().optional(),
        occupation: z.string().max(120).optional(),
      }),
    )
    .default([]),
  staffRequirements: z.string().max(1000).optional(),
});
export type BriefOccupants = z.infer<typeof BriefOccupants>;

export const BriefDesignPrefs = z.object({
  orientation: z.string().max(500).optional(),
  doorDirection: z.string().max(200).optional(),
  views: z.string().max(500).optional(),
  basement: z.string().max(500).optional(),
  vastu: z.string().max(500).optional(),
  style: z.string().max(1000).optional(),
  lovedPlaces: z.string().max(2000).optional(),
  activities: z.string().max(2000).optional(),
  indoorPrefs: z.string().max(2000).optional(),
  outdoorPrefs: z.string().max(2000).optional(),
});
export type BriefDesignPrefs = z.infer<typeof BriefDesignPrefs>;

export const BriefMaterials = z.object({
  construction: z.string().max(1000).optional(),
  flooring: z.string().max(1000).optional(),
  walls: z.string().max(1000).optional(),
  cabinetry: z.string().max(1000).optional(),
  seating: z.string().max(1000).optional(),
  beds: z.string().max(1000).optional(),
});
export type BriefMaterials = z.infer<typeof BriefMaterials>;

export const BRIEF_SECTION_KEYS = [
  "basicInfo",
  "projectInfo",
  "occupants",
  "designPrefs",
  "spaceSchedule",
  "materials",
  "roomDetails",
  "assumptions",
  "approval",
] as const;
export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[number];

export const ProjectBriefUpsertSection = z.discriminatedUnion("section", [
  z.object({ projectId: z.string().uuid(), section: z.literal("basicInfo"), data: BriefBasicInfo }),
  z.object({ projectId: z.string().uuid(), section: z.literal("projectInfo"), data: BriefProjectInfo }),
  z.object({ projectId: z.string().uuid(), section: z.literal("occupants"), data: BriefOccupants }),
  z.object({ projectId: z.string().uuid(), section: z.literal("designPrefs"), data: BriefDesignPrefs }),
  z.object({
    projectId: z.string().uuid(),
    section: z.literal("spaceSchedule"),
    data: z.array(BriefSpaceRow),
  }),
  z.object({ projectId: z.string().uuid(), section: z.literal("materials"), data: BriefMaterials }),
  z.object({
    projectId: z.string().uuid(),
    section: z.literal("roomDetails"),
    data: z.array(BriefRoomDetail),
  }),
  z.object({
    projectId: z.string().uuid(),
    section: z.literal("assumptions"),
    data: z.object({ assumptions: z.string().max(10000) }),
  }),
  z.object({
    projectId: z.string().uuid(),
    section: z.literal("approval"),
    data: z.object({
      approvalNote: z.string().max(2000).optional(),
      approvedAt: z.string().date().optional(),
    }),
  }),
]);
export type ProjectBriefUpsertSection = z.infer<typeof ProjectBriefUpsertSection>;
