// mockui-scene.jsx — Direction B: literal mock-UI cut.
// WhatsApp chat (the "small change") → a folder of FINAL_rev6 files →
// red verdict → the AORMS revision register reveal → end card.

const { Sprite, useSprite, useTime, Easing, clamp } = window;

function TimeTagB() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${t.toFixed(0)}s`);
  }, [Math.floor(t)]);
  return null;
}

// ── Scene 1: WhatsApp chat ───────────────────────────────────────────────
function ChatBubble({ text, side, time, r }) {
  const isIn = side === 'in';
  return (
    <div style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
      alignSelf: isIn ? 'flex-start' : 'flex-end', maxWidth: '78%',
      background: isIn ? window.C.waBubbleIn : window.C.waBubbleOut,
      borderRadius: isIn ? '4px 20px 20px 20px' : '20px 4px 20px 20px',
      padding: '22px 26px 30px', position: 'relative' }}>
      <div style={{ fontFamily: window.FONT_SANS, fontSize: 38, color: '#e9edef',
        lineHeight: 1.32 }}>{text}</div>
      <span style={{ position: 'absolute', right: 20, bottom: 10,
        fontFamily: window.FONT_SANS, fontSize: 22, color: 'rgba(233,237,239,0.5)' }}>
        {time}</span>
    </div>
  );
}

function ChatScene() {
  const { localTime: L } = useSprite();
  const msgs = [
    { text: 'Ek chhota sa change karna tha 🙂', side: 'in', time: '11:47 pm', at: 0.5 },
    { text: 'bas facade thoda adjust karna hai', side: 'in', time: '11:48 pm', at: 1.3 },
    { text: 'aur lobby ko thoda open kar dein', side: 'in', time: '11:49 pm', at: 2.1 },
    { text: 'sir that\u2019s a design revision \u2014 shall I quote it?', side: 'out', time: '11:52 pm', at: 3.0 },
    { text: 'arre chhota sa toh hai. kal tak? \ud83d\ude4f', side: 'in', time: '11:53 pm', at: 3.9 },
  ];
  const headR = window.rise(L, 0, 0.5);
  const dim = clamp((L - 5.4) / 0.5, 0, 0.62);
  const search = window.rise(L, 5.6, 0.5, 24, Easing.easeOutBack);

  return (
    <div style={{ position: 'absolute', inset: 0, background: window.C.waBg,
      display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ opacity: headR.opacity, background: '#1f2c34', padding: '80px 40px 26px',
        display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#3b4a54',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 40, color: '#cfd6da' }}>M</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 40,
            color: '#e9edef' }}>Client · Mehta Residence</span>
          <span style={{ fontFamily: window.FONT_SANS, fontSize: 26,
            color: '#8696a0' }}>online</span>
        </div>
      </div>

      {/* messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24,
        padding: '48px 40px', justifyContent: 'flex-end' }}>
        {msgs.map((m, i) => (
          <ChatBubble key={i} {...m} r={window.rise(L, m.at, 0.4, 20, Easing.easeOutCubic)} />
        ))}
      </div>

      {/* dim + search overlay: no 'approved' anywhere */}
      <div style={{ position: 'absolute', inset: 0, background: '#000',
        opacity: dim, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 50, right: 50, top: '40%',
        opacity: search.opacity, transform: `translateY(${search.ty}px)` }}>
        <div style={{ background: '#0b141a', border: `1px solid ${window.C.layer03}`,
          borderRadius: 14, padding: '30px 34px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18,
            fontFamily: window.FONT_MONO, fontSize: 38, color: '#e9edef' }}>
            <span style={{ color: '#8696a0' }}>⌕</span> approved
          </div>
          <div style={{ height: 1, background: window.C.layer02, margin: '24px 0' }} />
          <div style={{ fontFamily: window.FONT_MONO, fontSize: 34, color: window.C.red }}>
            0 results in this chat</div>
        </div>
      </div>
    </div>
  );
}

// ── Scene 2: the file folder ─────────────────────────────────────────────
function FinderScene() {
  const { localTime: L } = useSprite();
  const win = window.rise(L, 0, 0.5, 30, Easing.easeOutCubic);
  const files = [
    { n: 'Mehta_FLOOR_PLAN.dwg', d: 'May 02', at: 0.5 },
    { n: 'Mehta_FLOOR_PLAN_final.dwg', d: 'May 19', at: 0.85 },
    { n: 'Mehta_FLOOR_PLAN_final_v2.dwg', d: 'Jun 01', at: 1.2 },
    { n: 'Mehta_FLOOR_PLAN_FINAL_rev4.dwg', d: 'Jun 14', at: 1.55 },
    { n: 'Mehta_rev6_ACTUAL-FINAL.dwg', d: 'Jun 22', at: 1.9, hot: true },
    { n: 'Mehta_rev6_ACTUAL-FINAL_v2.dwg', d: 'Jun 29', at: 2.25, hot: true },
  ];
  const caption = window.rise(L, 3.0, 0.55);

  return (
    <div style={{ position: 'absolute', inset: 0, background: window.C.bg,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 60px' }}>
      <div style={{ opacity: win.opacity, transform: `translateY(${win.ty}px)`,
        background: window.C.layer01, borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${window.C.border}`, boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
        {/* title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16,
          padding: '30px 34px', background: window.C.layer02 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <span key={c} style={{ width: 22, height: 22, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 30, color: window.C.textSec,
            marginLeft: 18 }}>📁 Mehta_Residence / Drawings</span>
        </div>
        {/* files */}
        <div style={{ padding: '18px 0' }}>
          {files.map((f, i) => {
            const r = window.rise(L, f.at, 0.4, 18);
            return (
              <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
                display: 'flex', alignItems: 'center', gap: 26, padding: '26px 40px',
                background: f.hot ? 'rgba(250,77,86,0.08)' : 'transparent' }}>
                <span style={{ fontSize: 44 }}>📄</span>
                <span style={{ flex: 1, fontFamily: window.FONT_MONO, fontSize: 34,
                  color: f.hot ? window.C.red : window.C.text, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.n}</span>
                <span style={{ fontFamily: window.FONT_MONO, fontSize: 28,
                  color: window.C.textMut }}>{f.d}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ opacity: caption.opacity, transform: `translateY(${caption.ty}px)`,
        marginTop: 60, fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 56,
        color: window.C.text, textAlign: 'center', lineHeight: 1.2 }}>
        Which one did the client<br/>actually <span style={{ color: window.C.red }}>approve?</span>
      </div>
    </div>
  );
}

// ── Scene 3: red verdict ─────────────────────────────────────────────────
function VerdictScene() {
  const { localTime: L } = useSprite();
  const p = Easing.easeOutExpo(clamp((L - 0.2) / 1.2, 0, 1));
  const numOp = clamp((L - 0.15) / 0.3, 0, 1);
  const lines = window.rise(L, 1.4, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, background: window.C.redDeep,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '0 80px' }}>
      <div style={{ fontFamily: window.FONT_MONO, fontSize: 32, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 40,
        opacity: window.fade(L, 0, 0.4) }}>Unbilled revisions</div>
      <div style={{ opacity: numOp, fontFamily: window.FONT_SANS, fontWeight: 700,
        fontSize: 200, color: '#fff', letterSpacing: '-0.05em', lineHeight: 0.9,
        fontVariantNumeric: 'tabular-nums' }}>{window.formatINR(p * 300000)}</div>
      <div style={{ opacity: lines.opacity, transform: `translateY(${lines.ty}px)`,
        marginTop: 56, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 50,
        color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 1.4 }}>
        No record. No approval trail.<br/>No extra fee.
      </div>
    </div>
  );
}

// ── Scene 4: the AORMS register reveal ───────────────────────────────────
function RegisterScene() {
  const { localTime: L } = useSprite();
  const win = window.rise(L, 0, 0.55, 30, Easing.easeOutCubic);
  const rows = [
    { rev: 'REV-04', date: '2026-06-18', label: 'Facade cladding change', source: 'CLIENT_DRIVEN', amount: '+ ₹48,000', at: 0.7 },
    { rev: 'REV-05', date: '2026-06-24', label: 'Lobby re-layout', source: 'CLIENT_DRIVEN', amount: '+ ₹92,000', at: 1.0 },
    { rev: 'REV-06', date: '2026-06-29', label: 'Column grid revision', source: 'CLIENT_DRIVEN', amount: '+ ₹1,60,000', at: 1.3, hi: true },
  ];
  const total = window.rise(L, 2.1, 0.6);
  const tp = Easing.easeOutCubic(clamp((L - 2.2) / 1.0, 0, 1));

  return (
    <div style={{ position: 'absolute', inset: 0, background: window.C.bg,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px' }}>
      <div style={{ opacity: win.opacity, transform: `translateY(${win.ty}px)`,
        background: window.C.layer01, borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${window.C.border}`, boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
        {/* app header */}
        <div style={{ padding: '38px 40px', background: window.C.layer02,
          display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: window.C.green }}>AORMS · Revision register</span>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 44,
            color: window.C.text }}>Mehta Residence · Project 2043</span>
        </div>
        {rows.map((row, i) => {
          const r = window.rise(L, row.at, 0.45, 22);
          return (
            <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)` }}>
              <window.RegisterRow rev={row.rev} date={row.date} label={row.label}
                source={row.source} amount={row.amount} highlight={row.hi} />
            </div>
          );
        })}
        {/* total bar */}
        <div style={{ opacity: total.opacity, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '34px 40px', background: window.C.layer02,
          borderTop: `2px solid ${window.C.green}` }}>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 32, letterSpacing: '0.06em',
            color: window.C.textSec, textTransform: 'uppercase' }}>Recovered & billable</span>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 700, fontSize: 56,
            color: window.C.green, fontVariantNumeric: 'tabular-nums' }}>
            {window.formatINR(tp * 300000)}</span>
        </div>
      </div>
      <div style={{ opacity: total.opacity, marginTop: 54, fontFamily: window.FONT_SANS,
        fontWeight: 500, fontSize: 46, color: window.C.text, textAlign: 'center', lineHeight: 1.3 }}>
        Same ₹3,00,000. <span style={{ color: window.C.green }}>This time, on the invoice.</span>
      </div>
    </div>
  );
}

function MockUIVideo() {
  return (
    <React.Fragment>
      <TimeTagB />
      <Sprite start={0} end={8.2}><ChatScene /></Sprite>
      <Sprite start={8.2} end={14.5}><FinderScene /></Sprite>
      <Sprite start={14.5} end={17.8}><VerdictScene /></Sprite>
      <Sprite start={17.8} end={25.4}><RegisterScene /></Sprite>
      <Sprite start={25.4} end={31}><window.EndCard /></Sprite>
      <window.BrandLogo />
    </React.Fragment>
  );
}

window.MockUIVideo = MockUIVideo;
