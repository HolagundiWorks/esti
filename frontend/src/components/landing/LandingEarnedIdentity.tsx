/**
 * "Earned Identity" landing section — the AORMS-U unique ID, the ID card and
 * the Certificate of Earned Identity (welcome kit), presented in the
 * operational tile grid with a CSS mock of the printed card.
 */

function CardMock() {
  return (
    <div className="esti-lp-idcard" aria-label="AORMS ID card">
      <div className="esti-lp-idcard__top">
        <img src="/aorms-logo-white.png" alt="AORMS" />
        <span>ID Card</span>
      </div>
      <div className="esti-lp-idcard__mid">
        <p className="esti-lp-idcard__uid-label">Unique Identification No</p>
        <p className="esti-lp-idcard__uid">AORMS-U-2K4P9F</p>
        <p className="esti-lp-idcard__name">Ar. Your Name</p>
      </div>
      <div className="esti-lp-idcard__bottom">
        <span>Earned · never bought</span>
        <span>aorms.in</span>
      </div>
    </div>
  );
}

export function EarnedIdentitySection() {
  return (
    <>
      <section className="esti-lp-section-break" aria-label="Earned identity">
        <div className="esti-lp-section-break__copy">
          <p className="esti-lp-section-break__eyebrow">13 / Earned Identity</p>
          <h2>Some things should still be earned</h2>
          <p>
            Every individual on AORMS carries one permanent Unique Identification No —
            AORMS-U-… — that follows them across every studio they work with. You can't buy
            it and you can't get it at signup: it arrives with a printable welcome kit — an
            ID card and a Certificate of Earned Identity.
          </p>
        </div>
      </section>
      <div className="esti-lp-grid">
        <div className="esti-lp-tile esti-lp-tile--2x2 esti-lp-tile--media">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">The card</span>
            <span className="esti-lp-tile__hdr-meta">CC SIZE · PRINTABLE</span>
          </div>
          <div className="esti-lp-tile__media esti-lp-tile__media--pad">
            <CardMock />
          </div>
        </div>

        <div className="esti-lp-tile">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--yellow" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">The 100-hour rule</span>
          </div>
          <div className="esti-lp-tile__body">
            <h3 className="esti-lp-feature-title">You can't buy this ID</h3>
            <ul className="esti-lp-bullets">
              <li>100 hours of running your practice on AORMS earns it</li>
              <li>Permanent — it never changes, whoever you work with</li>
            </ul>
          </div>
        </div>

        <div className="esti-lp-tile">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">Card tiers</span>
          </div>
          <div className="esti-lp-tile__body">
            <h3 className="esti-lp-feature-title">Essential, then Pro</h3>
            <ul className="esti-lp-bullets">
              <li>Essential — issued after completing 100 hours on AORMS</li>
              <li>Pro — issued against certification</li>
            </ul>
          </div>
        </div>

        <div className="esti-lp-tile esti-lp-tile--2x1">
          <div className="esti-lp-tile__hdr">
            <span className="esti-lp-dot esti-lp-dot--green" aria-hidden>●</span>
            <span className="esti-lp-tile__hdr-label">Certificate of Earned Identity</span>
            <span className="esti-lp-tile__hdr-meta">A4 · WELCOME KIT</span>
          </div>
          <div className="esti-lp-tile__body">
            <h3 className="esti-lp-feature-title">
              A certificate that records what the hours built
            </h3>
            <ul className="esti-lp-bullets">
              <li>Issued with your unique ID — name, number and date of issue</li>
              <li>Certifications and your professional growth record key to this ID</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
