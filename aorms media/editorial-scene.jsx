// editorial-scene.jsx — Direction A: type-driven editorial cut.
// The ₹3,00,000 slams in → the message → the messy revision trail →
// "sound familiar?" → the AORMS register turns it around → end card.

const { Stage, Sprite, useSprite, useTime, Easing, clamp } = window;

function TimeTag() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${t.toFixed(0)}s`);
  }, [Math.floor(t)]);
  return null;
}

// Count-up rupee hero
function MoneyHero() {
  const { localTime: L } = useSprite();
  const kicker = window.rise(L, 0.2, 0.5);
  // number counts 0 -> 300000 between 0.9s and 2.5s
  const p = Easing.easeOutExpo(clamp((L - 0.9) / 1.6, 0, 1));
  const val = window.formatINR(p * 300000);
  const numOpacity = clamp((L - 0.85) / 0.3, 0, 1);
  const sub = window.rise(L, 2.7, 0.6);
  // subtle scale settle on the number
  const numScale = 0.94 + 0.06 * Easing.easeOutCubic(clamp((L - 0.85) / 0.8, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 80px' }}>
      <div style={{ opacity: kicker.opacity, transform: `translateY(${kicker.ty}px)`,
        fontFamily: window.FONT_MONO, fontSize: 34, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: window.C.textSec, marginBottom: 54 }}>
        One message
      </div>
      <div style={{ opacity: numOpacity, transform: `scale(${numScale})`,
        transformOrigin: 'center', fontFamily: window.FONT_SANS, fontWeight: 700,
        fontSize: 210, letterSpacing: '-0.05em', color: window.C.red,
        lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>
        {val}
      </div>
      <div style={{ opacity: sub.opacity, transform: `translateY(${sub.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 52, color: window.C.text,
        textAlign: 'center', marginTop: 46, lineHeight: 1.25 }}>
        That's what one <span style={{ color: window.C.textSec }}>“small change”</span> cost.
      </div>
    </div>
  );
}

// The verbal request, quoted big
function TheMessage() {
  const { localTime: L } = useSprite();
  const q = window.rise(L, 0.15, 0.6);
  const tr = window.rise(L, 0.95, 0.55);
  const rule = clamp((L - 0.5) / 0.7, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
      padding: '0 96px' }}>
      <div style={{ fontFamily: window.FONT_SANS, fontWeight: 700, fontSize: 60,
        color: window.C.red, opacity: window.fade(L, 0, 0.4), lineHeight: 1,
        marginBottom: 8 }}>“</div>
      <div style={{ opacity: q.opacity, transform: `translateY(${q.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 96,
        letterSpacing: '-0.03em', color: window.C.text, lineHeight: 1.12 }}>
        Ek chhota sa<br/>change karna tha…
      </div>
      <div style={{ width: 620, height: 3, background: window.C.red, marginTop: 40,
        transform: `scaleX(${rule})`, transformOrigin: 'left' }} />
      <div style={{ opacity: tr.opacity, transform: `translateY(${tr.ty}px)`,
        fontFamily: window.FONT_MONO, fontSize: 34, color: window.C.textSec,
        marginTop: 40, letterSpacing: '0.02em' }}>
        “just one small change…” — a client, 11:47&nbsp;pm
      </div>
    </div>
  );
}

// The revision trail: version-file list builds while unbilled counter climbs,
// then three verdict stamps land.
function TheTrail() {
  const { localTime: L } = useSprite();
  const files = [
    { name: 'FLOOR_PLAN_final.dwg', at: 0.2 },
    { name: 'FLOOR_PLAN_final_v2.dwg', at: 0.7 },
    { name: 'FLOOR_PLAN_FINAL_rev4.dwg', at: 1.2 },
    { name: 'FLOOR_PLAN_rev6_ACTUAL-FINAL.dwg', at: 1.7 },
  ];
  const header = window.rise(L, 0, 0.5);
  // unbilled climbs 0 -> 300000 between 0.4 and 2.4
  const p = Easing.easeInOutCubic(clamp((L - 0.4) / 2.0, 0, 1));
  const stamps = ['No revision record.', 'No approval trail.', 'No extra fee.'];
  const SQ = window.SQUARE;

  return (
    <div style={{ position: 'absolute', inset: 0,
      padding: SQ ? '0 90px' : '150px 90px 0',
      justifyContent: SQ ? 'center' : 'flex-start',
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ opacity: header.opacity, transform: `translateY(${header.ty}px)`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: SQ ? 34 : 50 }}>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 30,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: window.C.textSec }}>
          6 revisions later</span>
      </div>

      {/* file list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SQ ? 14 : 22 }}>
        {files.map((f, i) => {
          const r = window.rise(L, f.at, 0.45, 26);
          return (
            <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
              display: 'flex', alignItems: 'center', gap: 22,
              padding: SQ ? '18px 30px' : '26px 30px', background: window.C.layer01,
              border: `1px solid ${window.C.border}` }}>
              <span style={{ fontFamily: window.FONT_MONO, fontSize: 26,
                color: window.C.redDeep, fontWeight: 600 }}>rev{i + 1}</span>
              <span style={{ fontFamily: window.FONT_MONO, fontSize: 30,
                color: window.C.text, whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis' }}>{f.name}</span>
            </div>
          );
        })}
      </div>

      {/* unbilled counter */}
      <div style={{ opacity: window.fade(L, 0.5, 0.5), marginTop: SQ ? 32 : 60,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 28,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: window.C.textSec }}>
          Unbilled</span>
        <span style={{ fontFamily: window.FONT_SANS, fontWeight: 700, fontSize: SQ ? 88 : 120,
          color: window.C.red, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.05 }}>{window.formatINR(p * 300000)}</span>
      </div>

      {/* verdict stamps */}
      <div style={{ marginTop: SQ ? 28 : 54, display: 'flex', flexDirection: 'column', gap: SQ ? 12 : 20 }}>
        {stamps.map((s, i) => {
          const at = 2.7 + i * 0.35;
          const r = window.rise(L, at, 0.4, 18, Easing.easeOutBack);
          return (
            <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
              fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: SQ ? 40 : 52,
              color: window.C.text, display: 'flex', alignItems: 'center', gap: 22 }}>
              <span style={{ color: window.C.red, fontSize: SQ ? 34 : 46 }}>✕</span>{s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SoundFamiliar() {
  const { localTime: L } = useSprite();
  const r = window.rise(L, 0.1, 0.7, 30, Easing.easeOutCubic);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 108,
        letterSpacing: '-0.03em', color: window.C.text, textAlign: 'center' }}>
        Sound<br/>familiar?
      </div>
    </div>
  );
}

// The turn: AORMS register
function TheTurn() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0.1, 0.6);
  const rows = [
    { rev: 'REV-04', date: '2026-06-18', label: 'Facade cladding change', source: 'CLIENT_DRIVEN', amount: '+ ₹48,000', at: 0.7 },
    { rev: 'REV-05', date: '2026-06-24', label: 'Lobby re-layout', source: 'CLIENT_DRIVEN', amount: '+ ₹92,000', at: 1.0 },
    { rev: 'REV-06', date: '2026-06-29', label: 'Column grid revision', source: 'CLIENT_DRIVEN', amount: '+ ₹1,60,000', at: 1.3, hi: true },
  ];
  const foot = window.rise(L, 2.0, 0.6);
  const SQ = window.SQUARE;
  return (
    <div style={{ position: 'absolute', inset: 0,
      padding: SQ ? '0 70px' : '150px 70px 0',
      justifyContent: SQ ? 'center' : 'flex-start',
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: SQ ? 32 : 44 }}>
        <div style={{ fontFamily: window.FONT_MONO, fontSize: 28,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: window.C.green,
          marginBottom: 18 }}>Revision register · Project 2043</div>
        <div style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 62,
          color: window.C.text, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Every revision, numbered<br/>and dated.
        </div>
      </div>

      <div style={{ border: `1px solid ${window.C.border}` }}>
        {rows.map((row, i) => {
          const r = window.rise(L, row.at, 0.45, 24);
          return (
            <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)` }}>
              <window.RegisterRow rev={row.rev} date={row.date} label={row.label}
                source={row.source} amount={row.amount} highlight={row.hi} />
            </div>
          );
        })}
      </div>

      <div style={{ opacity: foot.opacity, transform: `translateY(${foot.ty}px)`,
        marginTop: SQ ? 32 : 50, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 46,
        color: window.C.text, lineHeight: 1.3 }}>
        And whether you agreed<br/>to <span style={{ color: window.C.green }}>absorb it.</span>
      </div>
    </div>
  );
}

function EditorialVideo() {
  return (
    <React.Fragment>
      <TimeTag />
      <Sprite start={0} end={5.0}><MoneyHero /></Sprite>
      <Sprite start={5.0} end={10.0}><TheMessage /></Sprite>
      <Sprite start={10.0} end={17.2}><TheTrail /></Sprite>
      <Sprite start={17.2} end={20.0}><SoundFamiliar /></Sprite>
      <Sprite start={20.0} end={25.6}><TheTurn /></Sprite>
      <Sprite start={25.6} end={31}><window.EndCard /></Sprite>
      <window.BrandLogo />
    </React.Fragment>
  );
}

window.EditorialVideo = EditorialVideo;
