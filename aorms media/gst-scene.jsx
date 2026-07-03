// gst-scene.jsx — Video 2 (P3, Product in 30s): "Any software prints a GST bill."
// The differentiator isn't invoicing — it's compliance: filing-deadline reminders
// on the dashboard, plus a ready GST abstract and TDS abstract. Green accent.

const { Sprite, useSprite, useTime, Easing, clamp } = window;

function TimeTagGst() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${t.toFixed(0)}s`);
  }, [Math.floor(t)]);
  return null;
}

// ── 1 · Hook — reframe away from invoicing ───────────────────────────────
function HookScene() {
  const { localTime: L } = useSprite();
  const a = window.rise(L, 0.2, 0.6);
  const b = window.rise(L, 1.6, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center', padding: '0 96px' }}>
      <div style={{ opacity: a.opacity, transform: `translateY(${a.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 78,
        color: window.C.textSec, letterSpacing: '-0.02em', lineHeight: 1.12 }}>
        Any software can<br/>print a GST bill.
      </div>
      <div style={{ width: 120, height: 4, background: window.C.green, margin: '48px 0',
        opacity: window.fade(L, 1.3, 0.5) }} />
      <div style={{ opacity: b.opacity, transform: `translateY(${b.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 92,
        color: window.C.text, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
        None of them<br/>remind you to<br/><span style={{ color: window.C.green }}>file it.</span>
      </div>
    </div>
  );
}

// ── 2 · Dashboard filing-deadline reminders ──────────────────────────────
function DeadlineRow({ code, label, due, days, urgent, r }) {
  const c = urgent ? window.C.red : window.C.green;
  return (
    <div style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
      display: 'flex', alignItems: 'center', gap: 24, padding: '30px 36px',
      background: window.C.layer01, border: `1px solid ${window.C.border}`,
      borderLeft: `4px solid ${c}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 34, fontWeight: 600,
          color: window.C.text }}>{code}</span>
        <span style={{ fontFamily: window.FONT_SANS, fontSize: 28, color: window.C.textSec }}>{label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 30, color: window.C.text }}>{due}</span>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, fontWeight: 600, color: c }}>
          {days}</span>
      </div>
    </div>
  );
}

function DashboardScene() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0, 0.55);
  const rows = [
    { code: 'TDS · 26Q', label: 'Deposit for June', due: 'Due 07 Jul', days: 'in 4 days', urgent: true, at: 0.7 },
    { code: 'GSTR-1', label: 'Outward supplies · June', due: 'Due 11 Jul', days: 'in 8 days', at: 1.1 },
    { code: 'GSTR-3B', label: 'Summary return · June', due: 'Due 20 Jul', days: 'in 17 days', at: 1.5 },
  ];
  const foot = window.rise(L, 3.0, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 60px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: 40 }}>
        <div style={{ fontFamily: window.FONT_MONO, fontSize: 28, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: window.C.green, marginBottom: 16 }}>
          Dashboard · Compliance</div>
        <div style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 60,
          color: window.C.text, letterSpacing: '-0.02em', lineHeight: 1.08 }}>
          Every filing deadline,<br/>on your dashboard.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {rows.map((row, i) => (
          <DeadlineRow key={i} {...row} r={window.rise(L, row.at, 0.45, 22)} />
        ))}
      </div>
      <div style={{ opacity: foot.opacity, transform: `translateY(${foot.ty}px)`,
        marginTop: 40, fontFamily: window.FONT_MONO, fontSize: 30, color: window.C.textSec }}>
        No missed due dates. No late-fee surprises.
      </div>
    </div>
  );
}

// ── 3 · GST & TDS abstracts, generated for you ───────────────────────────
function AbstractCard({ title, tag, rows, accent, r }) {
  const sq = window.SQUARE;
  return (
    <div style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
      background: window.C.layer01, border: `1px solid ${window.C.border}`,
      borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: sq ? '20px 34px' : '26px 34px', background: window.C.layer02,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 40,
          color: window.C.text }}>{title}</span>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 24, color: accent,
          background: 'rgba(66,190,101,0.14)', padding: '10px 16px', borderRadius: 4,
          letterSpacing: '0.04em' }}>{tag}</span>
      </div>
      <div style={{ padding: sq ? '6px 34px 12px' : '10px 34px 20px' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: sq ? '14px 0' : '20px 0',
            borderBottom: i < rows.length - 1 ? `1px solid ${window.C.bg}` : 'none' }}>
            <span style={{ fontFamily: window.FONT_SANS, fontSize: 30,
              color: window.C.textSec }}>{row[0]}</span>
            <span style={{ fontFamily: window.FONT_MONO, fontSize: 32, fontWeight: 500,
              color: window.C.text }}>{row[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AbstractsScene() {
  const { localTime: L } = useSprite();
  const sq = window.SQUARE;
  const head = window.rise(L, 0, 0.55);
  const gst = window.rise(L, 0.7, 0.55, 28, Easing.easeOutCubic);
  const tds = window.rise(L, 1.5, 0.55, 28, Easing.easeOutCubic);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: sq ? '0 60px 40px' : '0 60px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: sq ? 24 : 36, fontFamily: window.FONT_SANS, fontWeight: 600,
        fontSize: sq ? 48 : 60, color: window.C.text, letterSpacing: '-0.02em', lineHeight: 1.08 }}>
        And the abstracts,<br/>already totalled.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: sq ? 18 : 26 }}>
        <AbstractCard title="GST abstract" tag="JUN 2026" accent={window.C.green} r={gst}
          rows={[['Taxable outward supplies', '₹9,83,000'],
                 ['Output GST @ 18%', '₹1,76,940'],
                 ['Input tax credit', '₹41,200']]} />
        <AbstractCard title="TDS abstract" tag="Q1 · 26Q" accent={window.C.green} r={tds}
          rows={[['Deducted (194J · 10%)', '₹28,400'],
                 ['Deposited', '₹28,400'],
                 ['Balance payable', '₹0']]} />
      </div>
    </div>
  );
}

// ── 4 · Payoff ───────────────────────────────────────────────────────────
function PayoffScene() {
  const { localTime: L } = useSprite();
  const a = window.rise(L, 0.15, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ opacity: a.opacity, transform: `translateY(${a.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 88,
        color: window.C.text, textAlign: 'center', letterSpacing: '-0.03em', lineHeight: 1.14 }}>
        Not just bills.<br/>Your filing calendar,<br/><span style={{ color: window.C.green }}>handled.</span>
      </div>
    </div>
  );
}

function GstVideo() {
  return (
    <React.Fragment>
      <TimeTagGst />
      <Sprite start={0} end={4.8}><HookScene /></Sprite>
      <Sprite start={4.8} end={13.0}><DashboardScene /></Sprite>
      <Sprite start={13.0} end={21.0}><AbstractsScene /></Sprite>
      <Sprite start={21.0} end={24.8}><PayoffScene /></Sprite>
      <Sprite start={24.8} end={31}>
        <window.EndCard accent={window.C.green}
          line1={<React.Fragment>GST &amp; TDS deadlines,<br/>abstracts, done for you.</React.Fragment>}
          line2="Compliance dashboard on AORMS Pro." />
      </Sprite>
      <window.BrandLogo />
    </React.Fragment>
  );
}

window.GstVideo = GstVideo;
