import type { DB } from "../../db/index.js";
import { getOrgSettings } from "../../lib/settings.js";
import { listOfficeActivity } from "../activity/queries.js";
import { getActionCenter } from "./actionCenter.js";
import { getDashboardBoards } from "./boards.js";
import { getClientIntelligence } from "./clientIntelligence.js";
import { getFinancialHealth } from "./financial.js";
import { getProjectHealth } from "./projectHealth.js";
import { getRevisionIntelligence } from "./revisionIntelligence.js";
import { getDashboardSummary } from "./summary.js";
import { getTechnicalIntelligence } from "./technicalIntelligence.js";

/** Normalises org module toggles for dashboard payloads. */
export function dashboardModuleFlags(settings: {
  financialEnabled?: boolean | null;
  projectEnabled?: boolean | null;
}) {
  return {
    financialEnabled: settings.financialEnabled !== false,
    projectEnabled: settings.projectEnabled !== false,
  };
}

/** Single round-trip payload for the office dashboard home view. */
export async function getDashboardHome(db: DB) {
  const settings = await getOrgSettings(db);
  const { financialEnabled, projectEnabled } = dashboardModuleFlags(settings);

  const [
    summary,
    boards,
    actionCenter,
    financialHealth,
    projectHealth,
    clientIntelligence,
    revisionIntelligence,
    technicalIntelligence,
    activity,
  ] = await Promise.all([
    getDashboardSummary(db),
    getDashboardBoards(db),
    getActionCenter(db),
    financialEnabled ? getFinancialHealth(db) : Promise.resolve(null),
    projectEnabled ? getProjectHealth(db) : Promise.resolve([]),
    getClientIntelligence(db),
    getRevisionIntelligence(db),
    getTechnicalIntelligence(db),
    listOfficeActivity(db, { limit: 4, visibility: "STAFF" }),
  ]);

  return {
    summary,
    boards,
    actionCenter,
    financialHealth,
    projectHealth,
    clientIntelligence,
    revisionIntelligence,
    technicalIntelligence,
    activity,
    financialEnabled,
    projectEnabled,
  };
}
