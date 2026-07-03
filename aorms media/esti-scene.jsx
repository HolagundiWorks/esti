// esti-scene.jsx — Video 3 (P4, ESTI): "Your office has a pulse. Can you read it?"
// Hook → the Pulse ring computes from live signals → Ask ESTI answers from the
// record, not the internet → end card. Purple accent.

const { Sprite, useSprite, useTime, Easing, clamp } = window;
const P = '#be95ff';       // purple-40
const PDEEP = '#8a3ffc';   // purple-50

function TimeTagEsti() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${t.toFixed(0)}s`);
  }, [Math.floor(t)]);
  return null;
}

function HookScene() {
  const { localTime: L } = useSprite();
  const a = window.rise(L, 0.2, 0.6);
  const b = window.rise(L, 1.4, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center', padding: '0 96px' }}>
      <div style={{ opacity: a.opacity, transform: `translateY(${a.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 108,
        color: window.C.text, letterSpacing: '-0.03em', lineHeight: 1.06 }}>
        Your office<br/>has a pulse.
      </div>
      <div style={{ opacity: b.opacity, transform: `translateY(${b.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 108,
        color: P, letterSpacing: '-0.03em', lineHeight: 1.06, marginTop: 24 }}>
        Can you<br/>read it?
      </div>
    </div>
  );
}

// The Pulse ring computes from live signals
function PulseScene() {
  const { localTime: L } = useSprite();
  const ringIn = window.rise(L, 0.1, 0.6, 20, Easing.easeOutCubic);
  // ring fills 0 -> 0.62 turn between 0.5 and 2.5; score counts to 62
  const fillT = Easing.easeOutCubic(clamp((L - 0.5) / 2.2, 0, 1));
  const turn = fillT * 0.62;
  const score = Math.round(fillT * 62);
  const signals = [
    { t: '3 deadlines land Thursday', at: 2.6 },
    { t: '2 client approvals overdue', at: 3.1 },
    { t: 'revision load up 40% this week', at: 3.6 },
  ];
  const caption = window.rise(L, 4.6, 0.6);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'transparent',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ opacity: ringIn.opacity, transform: `translateY(${ringIn.ty}px)`,
        marginBottom: 20, fontFamily: window.FONT_MONO, fontSize: 30,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: P }}>ESTI Pulse</div>

      {/* ring */}
      <div style={{ opacity: ringIn.opacity, width: 460, height: 460, borderRadius: '50%',
        background: `conic-gradient(${P} 0turn ${turn}turn, ${window.C.layer02} ${turn}turn 1turn)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 60 }}>
        <div style={{ width: 350, height: 350, borderRadius: '50%', background: window.C.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 700, fontSize: 180,
            color: window.C.text, letterSpacing: '-0.04em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums' }}>{score}</span>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 28, color: window.C.textMut,
            letterSpacing: '0.1em', marginTop: 8 }}>/ 100 · this week</span>
        </div>
      </div>

      {/* contributing signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignSelf: 'flex-start',
        paddingLeft: 40 }}>
        {signals.map((s, i) => {
          const r = window.rise(L, s.at, 0.4, 16, Easing.easeOutCubic);
          return (
            <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
              display: 'flex', alignItems: 'center', gap: 18,
              fontFamily: window.FONT_MONO, fontSize: 34, color: window.C.textSec }}>
              <span style={{ color: P }}>▲</span>{s.t}
            </div>
          );
        })}
      </div>

      <div style={{ opacity: caption.opacity, transform: `translateY(${caption.ty}px)`,
        marginTop: 56, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 44,
        color: window.C.text, textAlign: 'center', lineHeight: 1.3 }}>
        Computed from your live record.<br/>
        <span style={{ color: window.C.textSec }}>Not an AI guess.</span>
      </div>
    </div>
  );
}

// Ask ESTI — grounded answer from the record
function AskScene() {
  const { localTime: L } = useSprite();
  const q = window.rise(L, 0.2, 0.55, 24, Easing.easeOutCubic);
  const think = L >= 1.3 && L < 2.2;
  const ans = window.rise(L, 2.3, 0.6, 24, Easing.easeOutCubic);
  const tag = window.rise(L, 4.4, 0.6);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'transparent',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 76px' }}>
      {/* question bubble */}
      <div style={{ opacity: q.opacity, transform: `translateY(${q.ty}px)`,
        alignSelf: 'flex-end', maxWidth: '82%', background: window.C.layer02,
        borderRadius: '22px 22px 4px 22px', padding: '32px 38px', marginBottom: 34 }}>
        <div style={{ fontFamily: window.FONT_SANS, fontSize: 42, color: window.C.text,
          lineHeight: 1.3 }}>Why does my Tuesday feel like this?</div>
      </div>

      {/* ESTI label */}
      <div style={{ opacity: window.fade(L, 1.1, 0.4), display: 'flex', alignItems: 'center',
        gap: 16, marginBottom: 22 }}>
        <span style={{ width: 44, height: 44, borderRadius: 10, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={window.ASSET('assets/esti-logo.png')} alt="" style={{ width: 34, height: 34 }} /></span>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 30, color: P,
          letterSpacing: '0.08em' }}>ESTI</span>
        {think && <span style={{ fontFamily: window.FONT_MONO, fontSize: 30,
          color: window.C.textMut }}>reading the record…</span>}
      </div>

      {/* answer */}
      <div style={{ opacity: ans.opacity, transform: `translateY(${ans.ty}px)`,
        alignSelf: 'flex-start', maxWidth: '92%', background: 'rgba(26,18,40,0.94)',
        border: `1px solid ${PDEEP}`, borderRadius: '4px 22px 22px 22px', padding: '38px 42px' }}>
        <div style={{ fontFamily: window.FONT_SANS, fontSize: 44, color: window.C.text,
          lineHeight: 1.42 }}>
          Three approvals are overdue on <span style={{ color: P }}>Project 2043</span>,
          two revisions were logged since Monday, and four deadlines land Thursday.
        </div>
        <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {['Project 2043', 'Revision log', 'Deadlines'].map((c) => (
            <span key={c} style={{ fontFamily: window.FONT_MONO, fontSize: 24,
              color: window.C.textSec, background: window.C.layer01, padding: '10px 16px',
              borderRadius: 4 }}>↳ {c}</span>
          ))}
        </div>
      </div>

      <div style={{ opacity: tag.opacity, transform: `translateY(${tag.ty}px)`,
        marginTop: 50, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 42,
        color: window.C.text, textAlign: 'center', lineHeight: 1.3 }}>
        Deterministic systems make the score.<br/>
        <span style={{ color: P }}>ESTI explains it.</span>
      </div>
    </div>
  );
}

function EstiVideo() {
  return (
    <React.Fragment>
      <TimeTagEsti />
      <Sprite start={0} end={4.4}><HookScene /></Sprite>
      <Sprite start={4.4} end={13.4}><PulseScene /></Sprite>
      <Sprite start={13.4} end={21.6}><AskScene /></Sprite>
      <Sprite start={21.6} end={27}>
        <window.EndCard accent={P} logoMark="assets/esti-logo.png"
          line1={<React.Fragment>Read your office's<br/>pulse — every morning.</React.Fragment>}
          line2="ESTI · inside AORMS Pro." />
      </Sprite>
      <window.BrandLogo />
    </React.Fragment>
  );
}

window.EstiVideo = EstiVideo;
