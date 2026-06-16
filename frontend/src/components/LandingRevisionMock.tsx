/**
 * Static revision-flow mock for the marketing page — custom HTML/CSS, not Carbon.
 */
export function LandingRevisionMock() {
  return (
    <div className="esti-lp-revision" aria-hidden>
      <div className="esti-lp-revision__dialog">
        <header className="esti-lp-revision__head">
          <h3>Transition: Client instruction — facade material from brick to ACM cladding</h3>
        </header>
        <div className="esti-lp-revision__body">
          <p>
            Current state:{" "}
            <span className="esti-lp-revision__badge esti-lp-revision__badge--review">
              Client review
            </span>
          </p>
          <label className="esti-lp-revision__field">
            <span>Move to</span>
            <select defaultValue="accepted" disabled>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <div className="esti-lp-revision__warn" role="note">
            <strong>Major revision</strong>
            <p>
              This instruction is classified MAJOR. Accepting it may affect programme, fee
              recovery and the next GFC issue — confirm before the drawing register advances.
            </p>
          </div>
          <label className="esti-lp-revision__check">
            <input type="checkbox" disabled />
            <span>
              I confirm this major design revision has been reviewed and accepted on behalf of the
              practice.
            </span>
          </label>
        </div>
        <footer className="esti-lp-revision__foot">
          <button type="button" className="esti-lp-btn esti-lp-btn--ghost" disabled>
            Cancel
          </button>
          <button type="button" className="esti-lp-btn esti-lp-btn--primary" disabled>
            Confirm transition
          </button>
        </footer>
      </div>
    </div>
  );
}
