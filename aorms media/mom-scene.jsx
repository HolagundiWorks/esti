// mom-scene.jsx — Video 4 (P4, ESTI): "The revision nobody had to write."
// Architect logs Minutes of Meeting → client sees the same record → ESTI reads
// the minutes and drafts the revision → client taps "Push to architect" → payoff.
// Purple (ESTI) accent; CLIENT_DRIVEN tag stays blue.

const { Sprite, useSprite, useTime, Easing, clamp } = window;
const MP = '#c6a2ff';      // purple-40 (lifted for contrast on contour)
const MPDEEP = '#8a3ffc';  // purple-50

function TimeTagMom() {
  const t = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${t.toFixed(0)}s`);
  }, [Math.floor(t)]);
  return null;
}

// ── 1 · Hook — the client's real pain ────────────────────────────────────
function HookScene() {
  const { localTime: L } = useSprite();
  const a = window.rise(L, 0.2, 0.6);
  const b = window.rise(L, 1.6, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center', padding: '0 96px' }}>
      <div style={{ opacity: a.opacity, transform: `translateY(${a.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 84,
        color: window.C.text, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
        Clients hate<br/>revisions.
      </div>
      <div style={{ opacity: b.opacity, transform: `translateY(${b.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 84,
        color: window.C.textSec, letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 28 }}>
        They hate <span style={{ color: MP }}>writing<br/>them down</span> even more.
      </div>
    </div>
  );
}

// Shared minutes-of-meeting card. `role` sets the header chrome.
function MinutesCard({ L, role, accent }) {
  const bullets = [
    'Move the staircase 300 mm east',
    'Lobby lighting to be warmer (3000K)',
    'Facade cladding sample — approved',
  ];
  const isClient = role === 'client';
  return (
    <div style={{ background: window.C.layer01, border: `1px solid ${window.C.border}`,
      borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '30px 36px', background: window.C.layer02,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: accent }}>
            {isClient ? 'Client portal' : 'Minutes of meeting'}</span>
          <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 40,
            color: window.C.text }}>Project 2043 · Client review</span>
        </div>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, color: window.C.textMut }}>29 Jun</span>
      </div>
      <div style={{ padding: '30px 36px' }}>
        <div style={{ fontFamily: window.FONT_MONO, fontSize: 24, color: window.C.textMut,
          letterSpacing: '0.06em', marginBottom: 26 }}>DISCUSSED</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {bullets.map((b, i) => {
            const r = window.rise(L, 1.2 + i * 0.6, 0.45, 16);
            return (
              <div key={i} style={{ opacity: r.opacity, transform: `translateY(${r.ty}px)`,
                display: 'flex', alignItems: 'flex-start', gap: 20,
                fontFamily: window.FONT_SANS, fontSize: 36, color: window.C.text, lineHeight: 1.3 }}>
                <span style={{ color: accent, flexShrink: 0 }}>•</span>{b}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '24px 36px', borderTop: `1px solid ${window.C.bg}`,
        display: 'flex', alignItems: 'center', gap: 14,
        opacity: window.fade(L, 3.2, 0.5) }}>
        <span style={{ color: window.C.green, fontSize: 30 }}>✓</span>
        <span style={{ fontFamily: window.FONT_MONO, fontSize: 28, color: window.C.textSec }}>
          {isClient ? 'Received from architect' : 'Shared with client'}</span>
      </div>
    </div>
  );
}

// ── 2 · Architect logs the minutes ───────────────────────────────────────
function MomScene() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0, 0.55);
  const card = window.rise(L, 0.5, 0.55, 30, Easing.easeOutCubic);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 64px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: 40, fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 50,
        color: window.C.text, lineHeight: 1.2 }}>
        After the meeting, the architect<br/>logs the minutes.
      </div>
      <div style={{ opacity: card.opacity, transform: `translateY(${card.ty}px)` }}>
        <MinutesCard L={L} role="architect" accent={window.C.blue} />
      </div>
    </div>
  );
}

// ── 3 · Client sees the same record ──────────────────────────────────────
function ClientScene() {
  const { localTime: L } = useSprite();
  const head = window.rise(L, 0, 0.55);
  const card = window.rise(L, 0.5, 0.55, 30, Easing.easeOutCubic);
  const foot = window.rise(L, 3.6, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 64px' }}>
      <div style={{ opacity: head.opacity, transform: `translateY(${head.ty}px)`,
        marginBottom: 40, fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 50,
        color: window.C.text, lineHeight: 1.2 }}>
        The client sees the <span style={{ color: MP }}>same record.</span>
      </div>
      <div style={{ opacity: card.opacity, transform: `translateY(${card.ty}px)` }}>
        <MinutesCard L={L} role="client" accent={MP} />
      </div>
      <div style={{ opacity: foot.opacity, transform: `translateY(${foot.ty}px)`,
        marginTop: 40, fontFamily: window.FONT_MONO, fontSize: 32, color: window.C.textSec,
        letterSpacing: '0.02em' }}>
        No email chain. No WhatsApp. One record.
      </div>
    </div>
  );
}

// ── 4 · ESTI reads the minutes and drafts the revision ───────────────────
function EstiScene() {
  const { localTime: L } = useSprite();
  const banner = window.rise(L, 0.2, 0.5, 20, Easing.easeOutCubic);
  const card = window.rise(L, 0.9, 0.55, 30, Easing.easeOutCubic);
  const fPush = 4.0;                 // client taps
  const pressed = L >= fPush && L < fPush + 0.22;
  const sent = L >= fPush + 0.22;
  const cursorIn = window.rise(L, 2.6, 0.6, 30, Easing.easeOutCubic);
  const caption = window.rise(L, 5.3, 0.6);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 64px' }}>
      {/* ESTI banner */}
      <div style={{ opacity: banner.opacity, transform: `translateY(${banner.ty}px)`,
        display: 'flex', alignItems: 'center', gap: 18, marginBottom: 34 }}>
        <span style={{ width: 60, height: 60, borderRadius: 14, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={window.ASSET('assets/esti-logo.png')} alt="" style={{ width: 46, height: 46 }} /></span>
        <span style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 44,
          color: window.C.text }}>ESTI read the minutes.</span>
      </div>

      {/* draft revision card */}
      <div style={{ opacity: card.opacity, transform: `translateY(${card.ty}px)`,
        background: window.C.layer01, border: `1.5px solid ${MPDEEP}`, borderRadius: 18,
        overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '28px 36px', background: 'rgba(138,63,252,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 26, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: MP }}>Suggested revision</span>
          <span style={{ fontFamily: window.FONT_MONO, fontSize: 30, fontWeight: 600,
            color: window.C.text }}>R-07</span>
        </div>
        <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 44,
            color: window.C.text, lineHeight: 1.25 }}>
            Relocate staircase 300&nbsp;mm east
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: window.FONT_MONO, fontSize: 24, color: window.C.blue,
              background: 'rgba(69,137,255,0.14)', padding: '10px 16px', borderRadius: 4 }}>
              CLIENT_DRIVEN · auto</span>
            <span style={{ fontFamily: window.FONT_MONO, fontSize: 24, color: window.C.textSec,
              background: window.C.layer02, padding: '10px 16px', borderRadius: 4 }}>
              ↳ from minutes · 29 Jun</span>
          </div>
        </div>
        {/* push button + cursor */}
        <div style={{ position: 'relative', margin: '4px 36px 40px' }}>
          <div style={{ padding: '30px', borderRadius: 12, textAlign: 'center',
            fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 40,
            background: sent ? window.C.green : MPDEEP, color: '#fff',
            transform: `scale(${pressed ? 0.97 : 1})` }}>
            {sent ? '✓  Sent to architect' : '↑  Push to architect'}
          </div>
          {/* click ripple */}
          {pressed && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 120, height: 120,
              marginLeft: -60, marginTop: -60, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.6)' }} />
          )}
          {/* cursor */}
          {L < fPush + 0.9 && (
            <div style={{ position: 'absolute', right: 120, bottom: -34,
              opacity: cursorIn.opacity,
              transform: `translateY(${cursorIn.ty + (pressed ? 8 : 0)}px)` }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                <path d="M5 3l14 8-6 1.5L10 19 5 3z" fill="#fff" stroke="#161616" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      <div style={{ opacity: caption.opacity, transform: `translateY(${caption.ty}px)`,
        marginTop: 40, fontFamily: window.FONT_SANS, fontWeight: 500, fontSize: 44,
        color: window.C.text, textAlign: 'center', lineHeight: 1.3 }}>
        ESTI drafts it. The client<br/><span style={{ color: MP }}>just taps send.</span>
      </div>
    </div>
  );
}

// ── 5 · Payoff ───────────────────────────────────────────────────────────
function PayoffScene() {
  const { localTime: L } = useSprite();
  const a = window.rise(L, 0.15, 0.6);
  const b = window.rise(L, 1.4, 0.6);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ opacity: a.opacity, transform: `translateY(${a.ty}px)`,
        fontFamily: window.FONT_SANS, fontWeight: 600, fontSize: 96, color: window.C.text,
        textAlign: 'center', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        The client didn't<br/>write a word.
      </div>
      <div style={{ opacity: b.opacity, transform: `translateY(${b.ty}px)`,
        marginTop: 44, fontFamily: window.FONT_MONO, fontSize: 38, color: MP,
        letterSpacing: '0.02em', textAlign: 'center' }}>
        Revision R-07 · raised from a conversation
      </div>
    </div>
  );
}

function MomVideo() {
  return (
    <React.Fragment>
      <TimeTagMom />
      <Sprite start={0} end={4.6}><HookScene /></Sprite>
      <Sprite start={4.6} end={11.4}><MomScene /></Sprite>
      <Sprite start={11.4} end={17.0}><ClientScene /></Sprite>
      <Sprite start={17.0} end={25.4}><EstiScene /></Sprite>
      <Sprite start={25.4} end={28.6}><PayoffScene /></Sprite>
      <Sprite start={28.6} end={33}>
        <window.EndCard accent={MP} logoMark="assets/esti-logo.png"
          line1={<React.Fragment>Conversations become<br/>revisions — automatically.</React.Fragment>}
          line2="ESTI · inside AORMS Pro." />
      </Sprite>
      <window.BrandLogo />
    </React.Fragment>
  );
}

window.MomVideo = MomVideo;
