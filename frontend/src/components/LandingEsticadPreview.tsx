/**
 * ESTICAD companion — explained for architects on the marketing page.
 */
export function LandingEsticadPreview() {
  return (
    <div className="esti-lp-esticad">
      <p className="esti-lp-esticad__intro">
        <strong>ESTICAD</strong> is free drawing software for Windows — made for Indian
        architecture practices. You use it like any CAD seat at your desk: plans, sections,
        dimensions, quantity checks. It does not replace AORMS; it connects to it so measured
        quantities and drawing context stay in the same project file as your fees, BOQ and issue
        register.
      </p>

      <div className="esti-lp-esticad__split">
        <div className="esti-lp-esticad__client">
          <p className="esti-lp-esticad__label">At your drawing desk · Windows PC</p>
          <h4>Draw and measure on canvas</h4>
          <ul className="esti-lp-esticad__list">
            <li>Work on plans offline — lines, layers and revisions on your machine</li>
            <li>Pick up wall lengths, slab areas and counts with snaps and ortho</li>
            <li>Get naming, dimension and note suggestions — you approve before they apply</li>
          </ul>
          <p className="esti-lp-esticad__note">Free to install · built for architects, not contractors</p>
        </div>

        <div className="esti-lp-esticad__bridge" aria-hidden>
          <span className="esti-lp-esticad__arrow">→</span>
          <span className="esti-lp-esticad__bridge-label">Linked to your studio</span>
        </div>

        <div className="esti-lp-esticad__cloud">
          <p className="esti-lp-esticad__label">In AORMS · your office record</p>
          <h4>One project file for the whole practice</h4>
          <ul className="esti-lp-esticad__list">
            <li>Measured quantities roll into the project BOQ and estimate</li>
            <li>Same drawing register, fee stages and GST trail as the web office</li>
            <li>AI assists run on your server — nothing leaves without your review</li>
          </ul>
          <p className="esti-lp-esticad__badge">Active AORMS studio · authorised staff only</p>
        </div>
      </div>

      <div className="esti-lp-esticad__policy">
        <span>
          <strong>Quantities when online</strong> — measured areas and lengths save to the project
          BOQ when you are signed in; they are not kept in a separate file on the laptop.
        </span>
        <span>
          <strong>Same component library</strong> — walls, slabs and structural items use the
          server catalogue shared with AORMS estimates.
        </span>
        <span>
          <strong>Jump from a project</strong> — use <strong>Open in ESTICAD</strong> on a drawing
          in AORMS and continue takeoff on your PC.
        </span>
      </div>
    </div>
  );
}
