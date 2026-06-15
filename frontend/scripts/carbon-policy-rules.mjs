/**
 * Shared Pure Carbon policy rules — see docs/esti/CARBON-UI-DIRECTION.md.
 * Staff workspace is enforced; documented exceptions are excluded.
 */

/** Files skipped entirely (marketing landing, special widgets). */
export const EXCLUDED_FILES = [
  /[/\\]routes[/\\]Landing\.tsx$/,
  /[/\\]components[/\\]HeaderPomodoro\.tsx$/,
];

/** First line (1-based) of the documented .esti-lp marketing block in styles.scss. */
export const LANDING_SCSS_START = 633;
/** Last line of .esti-lp-related rules before app-shell type scale. */
export const LANDING_SCSS_END = 1215;

const HEX_OR_GRADIENT =
  /(?:#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})\b|rgba?\s*\(|linear-gradient|box-shadow)/i;

const RAW_CONTROL = /<(?:button|input|select|textarea)\b/;

const DECORATIVE_PROPS =
  /\b(?:color|background(?:Color)?|fontSize|fontWeight|border(?:Top|Right|Bottom|Left|Radius)?|boxShadow|letterSpacing|textTransform)\s*:/;

function isExcludedFile(path) {
  const normalized = path.replace(/\\/g, "/");
  return EXCLUDED_FILES.some((re) => re.test(normalized));
}

function isLandingScssLine(lineNo) {
  return lineNo >= LANDING_SCSS_START && lineNo <= LANDING_SCSS_END;
}

function isLandingScssSelector(line) {
  return /\.esti-lp(?:-|\b)/.test(line);
}

/** Allow inline colour/background when values use Carbon tokens only. */
function inlineStyleUsesOnlyTokens(line) {
  if (!line.includes("style=")) return true;
  const decorative = line.match(DECORATIVE_PROPS);
  if (!decorative) return true;
  if (/var\(--cds-/.test(line)) return true;
  if (/transparent/.test(line)) return true;
  return false;
}

/**
 * @param {string} path
 * @param {string} line
 * @param {number} lineNo
 * @returns {string | null} violation reason
 */
export function checkLine(path, line, lineNo) {
  if (isExcludedFile(path)) return null;

  const ext = path.slice(path.lastIndexOf("."));
  if (![".ts", ".tsx", ".scss"].includes(ext)) return null;
  if (path.endsWith("carbon-policy.test.ts")) return null;

  if (ext === ".scss") {
    if (isLandingScssLine(lineNo) || isLandingScssSelector(line)) return null;
    if (HEX_OR_GRADIENT.test(line)) return "hard-coded visual value in SCSS";
    return null;
  }

  if (RAW_CONTROL.test(line)) return "raw form/control element";

  if (HEX_OR_GRADIENT.test(line)) return "hard-coded visual value";

  if (DECORATIVE_PROPS.test(line) && !inlineStyleUsesOnlyTokens(line)) {
    return "decorative inline style";
  }

  return null;
}

export function scanSource(path, source) {
  const lines = source.split(/\r?\n/);
  const failures = [];
  lines.forEach((line, index) => {
    const reason = checkLine(path, line, index + 1);
    if (reason) failures.push({ path, line: index + 1, reason });
  });
  return failures;
}
