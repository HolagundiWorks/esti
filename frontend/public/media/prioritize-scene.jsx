// prioritize-scene.jsx — Video 5 (P4, ESTI): "When everything is urgent."
// Hook (every site + task is urgent) → AI daily stand-up gathers site updates
// (any team member can report, no supervisor needed) → ESTI scores each task on
// client priority + site dependencies → a ranked, reasoned task list → payoff.
// Purple (ESTI) accent, contour bg + logo.

const { Sprite, useSprite, useTime, Easing, clamp } = window;
const PP = '#c6a2ff';
const PPDEEP = '#8a3ffc';

function TimeTagPri() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${t.toFixed(0)}s`);
  }, [Math.floor(t)]);
  return null;
}

// ── 1 · Hook — the tension ───────────────────────────────────────────────
function HookScene() {
  const { localTime: L } = useSprite();
  // three "URGENT" chips flash in, chaotic
  const chips = [
    { t: 'Site A — URGENT', x: -180, y: -260, rot: -8, at: 0.2 },
    { t: 'Site D — URGENT', x: 160, y: -120, rot: 6, at: 0.5 },
    { t: 'Site B — URGENT', x: -120, y: 40, rot: -4, at: 0.8 },
    { t: 'Site C — URGENT', x: 190, y: 180, rot: 9, at: 1.1 },
    { t: 'Site E — URGENT', x: -200, y: 300, rot: -6, at: 1.4 },
  ];
  const q = window.rise(L, 2.6, 0.6, 30, Easing.easeOutCubic);
  const chipsFade = window.fadeOut(L, 2.4, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
      {/* chaos of urgent chips */}
      <div style={{ position: 'absolute', inset: 0, opacity: chipsFade }}>
        {chips.map((c, i) => {
          const r = window.rise(L, c.at, 0.35, 0, Easing.easeOutBack);
          return (
            <div key={i} style={{ position: 'absolute', left: '50%', top: '46%',
              transform: `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px)) rotate(${c.rot}deg) scale(${0.7 + 0.3 * r.opacity})`,
              opacity: r.opacity, fontFamily: window.FONT_MONO, fontSize: 40, fontWeight: 600,
              color: window.C.red, background: 'rgba(250,77,86,0.12)',
              border: `1.5px solid ${window.C.red}`, padding: '18px 30px', borderRadius: 10,
              whiteSpace: 'nowrap' }}>{c.t}</div>
          );
        })}
      </div>
      {/* the question */}
      <div style={{ opacity: q.opacity, transform: `translateY(${q.ty}px)`, zIndex: 2,
        textAlign: 'center' }}>
        <div style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 92,
          color: window.C.text, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
          Everything's<br/>urgent.
        </div>
        <div style={{ marginTop: 34, fontFamily: window.FONT_SANS, fontWeight: 500,
          fontSize: 54, color: PP }}>So what comes first?</div>
      </div>
    </div>
  );
}

// ── 2 · AI daily stand-up ────────────────────────────────────────────────
function Bubble({ side, children, r, accent }) {
  const isEsti = side === 'esti';
  return (
    <div style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
      alignSelf: isEsti ? 'flex-start' : 'flex-end', maxWidth: '84%',
      background: isEsti ? 'rgba(138,63,252,0.12)' : window.C.layer02,
      border: isEsti ? `1px solid ${PPDEEP}` : `1px solid ${window.C.border}`,
      borderRadius: isEsti ? '4px 22px 22px 22px' : '22px 22px 4px 22px',
      padding: '28px 34px' }}>
      {children}
    </div>
  );
}

function StandupScene() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0, 0.5);
  const q1 = window.rise(L, 0.8, 0.5, 22, Easing.easeOutCubic);
  const a1 = window.rise(L, 2.0, 0.5, 22, Easing.easeOutCubic);
  const a2 = window.rise(L, 3.2, 0.5, 22, Easing.easeOutCubic);
  const note = window.rise(L, 4.6, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 60px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        display: 'flex', alignItems: 'center', gap: 18, marginBottom: 40 }}>
        <span style={{ width: 56, height: 56, borderRadius: 13, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={window.ASSET('assets/esti-logo.png')} alt="" style={{ width: 42, height: 42 }} /></span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 42,
            color: window.C.text }}>Daily stand-up</span>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, color: window.C.textSec }}>
            8:00 am · every site</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Bubble side="esti" r={q1}>
          <div style={{ fontFamily: window.FONT_SANS, fontSize: 38, color: window.C.text,
            lineHeight: 1.32 }}>Site B — what moved yesterday?</div>
        </Bubble>
        <Bubble side="user" r={a1}>
          <div style={{ fontFamily: window.FONT_SANS, fontSize: 38, color: window.C.text,
            lineHeight: 1.32 }}>Slab curing done. RCC inspection pending.</div>
          <div style={{ marginTop: 14, fontFamily: window.FONT_MONO, fontSize: 24,
            color: window.C.textMut }}>— Ravi · site mason</div>
        </Bubble>
        <Bubble side="user" r={a2}>
          <div style={{ fontFamily: window.FONT_SANS, fontSize: 38, color: window.C.text,
            lineHeight: 1.32 }}>Client visiting Thursday.</div>
        </Bubble>
      </div>

      <div style={{ opacity: note.opacity, transform: `translateY(${note.ty}px)`,
        marginTop: 40, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 40,
        color: window.C.text, lineHeight: 1.3 }}>
        No site supervisor? <span style={{ color: PP }}>Any team member can report.</span>
      </div>
    </div>
  );
}

// ── 3 · ESTI scores on client priority + dependencies ────────────────────
function ScoringScene() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0, 0.55);
  const factors = [
    { label: 'Client priority score', val: 'A-tier · 92', at: 0.8 },
    { label: 'Site dependencies', val: 'RCC blocks 3 tasks', at: 1.4 },
    { label: 'Deadline proximity', val: 'client visit · Thu', at: 2.0 },
  ];
  const eq = window.rise(L, 3.0, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 64px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: 44, fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 56,
        color: window.C.text, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        ESTI weighs what<br/>actually matters.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {factors.map((f, i) => {
          const r = window.rise(L, f.at, 0.45, 22);
          return (
            <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '30px 36px', background: window.C.layer01,
              border: `1px solid ${window.C.border}`, borderLeft: `4px solid ${PP}`,
              borderRadius: 12 }}>
              <span style={{ fontFamily: window.FONT_SANS, fontSize: 36,
                color: window.C.textSec }}>{f.label}</span>
              <span style={{ fontFamily: window.FONT_MONO, fontSize: 32, fontWeight: 500,
                color: window.C.text }}>{f.val}</span>
            </div>
          );
        })}
      </div>
      <div style={{ opacity: eq.opacity, transform: `translateY(${eq.ty}px)`,
        marginTop: 40, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 42,
        color: window.C.text, textAlign: 'center' }}>
        Not louder tasks. <span style={{ color: PP }}>Higher-leverage ones.</span>
      </div>
    </div>
  );
}

// ── 4 · Ranked, reasoned task list ───────────────────────────────────────
function PriorityRow({ n, task, site, reason, accent, r }) {
  return (
    <div style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
      display: 'flex', alignItems: 'flex-start', gap: 26, padding: '28px 34px',
      background: window.C.layer01, border: `1px solid ${window.C.border}`,
      borderRadius: 14 }}>
      <span style={{ fontFamily: window.FONT_SANS, fontWeight: 700, fontSize: 56,
        color: accent, lineHeight: 1, minWidth: 60 }}>{n}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 38,
            color: window.C.text }}>{task}</span>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, color: window.C.textMut }}>{site}</span>
        </div>
        <span style={{ fontFamily: window.FONT_SANS, fontSize: 28, color: window.C.textSec,
          lineHeight: 1.3 }}>↳ {reason}</span>
      </div>
    </div>
  );
}

function PriorityScene() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0, 0.55);
  const rows = [
    { n: '1', task: 'Book RCC inspection', site: 'Site B', reason: 'unblocks 3 downstream tasks + client visit Thu', accent: PP, at: 0.7 },
    { n: '2', task: 'Approve facade sample', site: 'Site A', reason: 'A-tier client · waiting 2 days', accent: window.C.text, at: 1.1 },
    { n: '3', task: 'Send revised BOQ', site: 'Site D', reason: 'no dependency · can slip a day', accent: window.C.textMut, at: 1.5 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 60px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: 40 }}>
        <div style={{ fontFamily: window.FONT_MONO, fontSize: 28, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: PP, marginBottom: 16 }}>Today · prioritised</div>
        <div style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 58,
          color: window.C.text, letterSpacing: '-0.02em' }}>Do this, in this order.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {rows.map((row, i) => (
          <PriorityRow key={i} {...row} r={window.rise(L, row.at, 0.45, 24)} />
        ))}
      </div>
    </div>
  );
}

// ── 5 · Payoff ───────────────────────────────────────────────────────────
function PayoffScene() {
  const { localTime: L } = useSprite();
  const a = window.rise(L, 0.15, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ opacity: a.opacity, transform: `translateY(${a.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 92,
        color: window.C.text, textAlign: 'center', letterSpacing: '-0.03em', lineHeight: 1.12 }}>
        Stop guessing<br/>what's <span style={{ color: PP }}>next.</span>
      </div>
    </div>
  );
}

function PrioritizeVideo() {
  return (
    <React.Fragment>
      <TimeTagPri />
      <Sprite start={0} end={5.2}><HookScene /></Sprite>
      <Sprite start={5.2} end={13.4}><StandupScene /></Sprite>
      <Sprite start={13.4} end={21.0}><ScoringScene /></Sprite>
      <Sprite start={21.0} end={28.4}><PriorityScene /></Sprite>
      <Sprite start={28.4} end={31.8}><PayoffScene /></Sprite>
      <Sprite start={31.8} end={37}>
        <window.EndCard accent={PP} logoMark="assets/esti-logo.png"
          line1={<React.Fragment>Every site, scored.<br/>Every morning, a plan.</React.Fragment>}
          line2="ESTI · inside AORMS Pro." />
      </Sprite>
      <window.BrandLogo />
    </React.Fragment>
  );
}

window.PrioritizeVideo = PrioritizeVideo;
