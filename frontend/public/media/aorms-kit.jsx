// aorms-kit.jsx — shared brand palette, timing helpers, and reusable UI
// components for the AORMS "Revision Register" launch reels.
// Reads Stage/Sprite/Easing/etc from window (animations.jsx loads first).

const C = {
  bg:        '#161616', // Carbon gray-100
  layer01:   '#262626', // gray-90
  layer02:   '#393939', // gray-80
  layer03:   '#525252', // gray-70
  border:    '#393939',
  borderHi:  '#525252',
  text:      '#f4f4f4',
  textSec:   '#a8a8a8', // gray-40
  textMut:   '#6f6f6f', // gray-50
  red:       '#fa4d56', // red-50  (P1 The Leak)
  redDeep:   '#da1e28', // red-60
  redDim:    '#5a1418',
  green:     '#42be65', // green-40 success
  greenDeep: '#24a148',
  blue:      '#4589ff', // blue-50
  waBg:      '#0b141a', // whatsapp dark
  waBubbleIn:'#1f2c34',
  waBubbleOut:'#005c4b',
};

const FONT_SANS = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

// Indian number grouping: 300000 -> ₹3,00,000
function formatINR(n) {
  n = Math.max(0, Math.round(n));
  let s = String(n);
  if (s.length <= 3) return '₹' + s;
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  rest = rest.replace(/\B(?=(\d\d)+(?!\d))/g, ',');
  return '₹' + rest + ',' + last3;
}

// reveal helper: given local time, an entry point `at`, and a `dur`,
// returns {opacity, ty} for a rise-in. ease optional.
function rise(local, at, dur = 0.5, dy = 22, ease) {
  const e = ease || window.Easing.easeOutCubic;
  const t = window.clamp((local - at) / dur, 0, 1);
  const k = e(t);
  return { opacity: k, ty: (1 - k) * dy };
}

// fade helper (no translate)
function fade(local, at, dur = 0.4) {
  return window.clamp((local - at) / dur, 0, 1);
}

// exit fade: fades a value to 0 across [at, at+dur]
function fadeOut(local, at, dur = 0.4) {
  return 1 - window.clamp((local - at) / dur, 0, 1);
}

// ── Brand end card ───────────────────────────────────────────────────────────
// The shared close. Wrap in a <Sprite start end> and pass localTime via useSprite.
function EndCard({
  w = 1080, h = 1920,
  accent = C.red,
  logoMark = null,
  line1 = <React.Fragment>A numbered, dated register<br/>for every revision.</React.Fragment>,
  line2 = 'Free for small practices.',
}) {
  const { localTime } = window.useSprite();
  const L = localTime;
  const mark = rise(L, 0.1, 0.6, 26, window.Easing.easeOutBack);
  const line1r = rise(L, 0.7, 0.55);
  const line2r = rise(L, 1.15, 0.55);
  const url = rise(L, 1.7, 0.55);
  const bar = window.clamp((L - 0.1) / 0.7, 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '0 90px' }}>

      {/* wordmark */}
      <div style={{ opacity: mark.opacity, transform: `translateY(${mark.ty}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30,
        marginBottom: 64 }}>
        {logoMark && <img src={window.ASSET(logoMark)} alt="" style={{ width: 132, height: 132 }} />}
        <span style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 96,
          letterSpacing: '-0.04em', color: C.text }}>AORMS</span>
      </div>

      {/* accent rule */}
      <div style={{ width: 560, height: 2, background: C.layer02, marginBottom: 56,
        position: 'relative', alignSelf: 'center' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: 2,
          width: `${bar * 100}%`, background: accent }} />
      </div>

      <div style={{ opacity: line1r.opacity, transform: `translateY(${line1r.ty}px)`,
        fontFamily: FONT_SANS, fontWeight: 600, fontSize: 60, color: C.text,
        textAlign: 'center', lineHeight: 1.15, marginBottom: 22 }}>
        {line1}
      </div>

      <div style={{ opacity: line2r.opacity, transform: `translateY(${line2r.ty}px)`,
        fontFamily: FONT_SANS, fontWeight: 400, fontSize: 40, color: C.textSec,
        textAlign: 'center', marginBottom: 120 }}>
        {line2}
      </div>

      <div style={{ opacity: url.opacity, transform: `translateY(${url.ty}px)`,
        position: 'absolute', bottom: 150, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 18 }}>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 500, fontSize: 46,
          color: C.text, letterSpacing: '0.01em' }}>aorms.in</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 26, color: C.textMut,
          letterSpacing: '0.14em', textTransform: 'uppercase' }}>Link in bio</div>
      </div>
    </div>
  );
}

// ── Register row ───────────────────────────────────────────────────────────
// A single row of the AORMS revision register.
function RegisterRow({ rev, date, label, source, amount, highlight, style }) {
  const isClient = source === 'CLIENT_DRIVEN';
  const tagColor = isClient ? C.blue : C.textMut;
  const tagBg = isClient ? 'rgba(69,137,255,0.14)' : 'rgba(111,111,111,0.16)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 232px 250px',
      alignItems: 'center', gap: 16, padding: '30px 30px',
      background: highlight ? '#2e2023' : C.layer01,
      borderLeft: `4px solid ${highlight ? C.red : 'transparent'}`,
      borderBottom: `1px solid ${C.bg}`, ...style }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 34, fontWeight: 600,
        color: C.text }}>{rev}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: FONT_SANS, fontSize: 32, color: C.text }}>{label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 24, color: C.textMut }}>{date}</span>
      </div>
      <span style={{ justifySelf: 'start', fontFamily: FONT_MONO, fontSize: 24,
        fontWeight: 500, letterSpacing: '0.04em', color: tagColor, background: tagBg,
        padding: '10px 16px', borderRadius: 4 }}>{source}</span>
      <span style={{ justifySelf: 'end', fontFamily: FONT_MONO, fontSize: 32,
        fontWeight: 600, whiteSpace: 'nowrap', color: amount === 'ABSORBED' ? C.textMut : C.green }}>
        {amount}</span>
    </div>
  );
}

// Resource resolver: in a standalone-bundled page window.__resources maps ids to
// blob URLs; everywhere else this returns the plain relative path unchanged.
const ASSET_IDS = {
  'assets/aorms-logo-white.png': 'aormsLogo',
  'assets/esti-logo.png': 'estiLogo',
  'assets/landing-contour-bg.svg': 'contourBg',
};
function ASSET(p) {
  const r = window.__resources;
  if (r) { const id = ASSET_IDS[p]; if (id && r[id]) return r[id]; }
  return p;
}

// ── Persistent brand furniture for the reels ────────────────────────────────
// Contour bg is set as the Stage background; this pins the logo bottom-right.
// In square (1:1) reels content runs closer to the corners, so the mark is
// smaller and more subdued to sit as a watermark that doesn't fight captions.
function BrandLogo() {
  const sq = window.SQUARE;
  return (
    <img src={window.ASSET('assets/aorms-logo-white.png')} alt="AORMS"
      style={{ position: 'absolute',
        right: sq ? 40 : 64, bottom: sq ? 34 : 60,
        width: sq ? 128 : 250, height: 'auto',
        zIndex: 50, opacity: sq ? 0.5 : 0.95, pointerEvents: 'none' }} />
  );
}

// Full CSS background string: darkened scrim over the contour texture.
const CONTOUR_BG = "linear-gradient(rgba(17,16,14,0.70), rgba(17,16,14,0.70)), url('assets/landing-contour-bg.svg') center/cover no-repeat, #11100e";
// Resource-aware variant for standalone bundles (resolves the svg via window.__resources).
function getContourBg() {
  return "linear-gradient(rgba(17,16,14,0.70), rgba(17,16,14,0.70)), url('" +
    ASSET('assets/landing-contour-bg.svg') + "') center/cover no-repeat, #11100e";
}

Object.assign(window, {
  C, FONT_SANS, FONT_MONO, formatINR, rise, fade, fadeOut, EndCard, RegisterRow,
  BrandLogo, CONTOUR_BG, ASSET, getContourBg,
});
