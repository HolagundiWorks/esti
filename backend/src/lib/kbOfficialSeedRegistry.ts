import {
  HCW_SEED_MAINTAINER,
  type OfficialSeedCity,
  type OfficialSeedPack,
} from "@esti/contracts";
import {
  BUILDING_DSR_VERSION_DESCRIPTION,
  BUILDING_DSR_VERSION_LABEL,
  CPWD_BUILDING_DSR_REF,
  KA_BUILDING_DSR_REF,
} from "@hcw/master-dsr-kit";
import { DEFAULT_BBMP_RULE_CATALOG } from "@hcw/india-compliance-kit/profiles/bbmp-2003";

/** Cities available for selective official seed activation (v0.1). */
export const OFFICIAL_SEED_CITIES: OfficialSeedCity[] = [
  {
    key: "bengaluru",
    label: "Bengaluru",
    stateCode: "IN-KA",
    district: "Bengaluru Urban",
  },
];

export const OFFICIAL_SEED_PACKS: OfficialSeedPack[] = [
  {
    packId: "dsr-ka-building-2026",
    kind: "DSR",
    label: KA_BUILDING_DSR_REF.label,
    description: BUILDING_DSR_VERSION_DESCRIPTION,
    maintainer: HCW_SEED_MAINTAINER,
    cityKeys: ["bengaluru"],
    readOnly: true,
  },
  {
    packId: "dsr-cpwd-building-2026",
    kind: "DSR",
    label: CPWD_BUILDING_DSR_REF.label,
    description:
      "CPWD central building schedule (stub v0.1). National baseline for government tenders.",
    maintainer: HCW_SEED_MAINTAINER,
    cityKeys: ["*"],
    readOnly: true,
  },
  {
    packId: "compliance-bbmp-2003",
    kind: "COMPLIANCE",
    label: DEFAULT_BBMP_RULE_CATALOG.label ?? "BBMP Building Bye-Laws 2003",
    description:
      "BBMP development control — FAR, setbacks, parking, secondary compliance (Bengaluru).",
    maintainer: HCW_SEED_MAINTAINER,
    cityKeys: ["bengaluru"],
    readOnly: true,
  },
];

export function officialPackById(packId: string): OfficialSeedPack | undefined {
  return OFFICIAL_SEED_PACKS.find((p) => p.packId === packId);
}

export function officialCityByKey(key: string): OfficialSeedCity | undefined {
  return OFFICIAL_SEED_CITIES.find((c) => c.key === key);
}

/** Whether a pack applies to a city key. */
export function packAppliesToCity(pack: OfficialSeedPack, cityKey: string): boolean {
  return pack.cityKeys.includes("*") || pack.cityKeys.includes(cityKey);
}
