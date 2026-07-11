import { useEffect } from "react";
import { MarketingShell } from "../components/landing/MarketingShell.js";

const CONTACT_EMAIL = "hi@aorms.in";

export function Legal() {
  useEffect(() => {
    const title = "Legal — AORMS";
    const description =
      "Terms of service, privacy policy, acceptable use, and licensing for AORMS by Human Centric Works.";
    document.title = title;
    const set = (sel: string, attr: "content" | "href", val: string) =>
      document.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('link[rel="canonical"]', "href", `${window.location.origin}/legal`);
  }, []);

  return (
    <MarketingShell contours tagline="Legal">
      <div className="lp2-ds">
        <header className="lp2-section-head lp2-reveal" id="top">
          <p className="lp2-section-head__tag">Legal</p>
          <h1 className="lp2-section-head__title">Legal</h1>
          <p className="lp2-section-head__body">
            Terms of service, privacy, acceptable use, and licensing for AORMS, operated by
            Human Centric Works.
          </p>
        </header>

        <article className="lp2-seo-article lp2-reveal">
          <div className="lp2-seo-article__body lp2-prose">
              <p>
                <em>Last updated: 2026. This is a plain-language summary; the binding terms are
                those in your signed subscription agreement. For a tailored agreement, contact
                us.</em>
              </p>

              <h2>1. Service</h2>
              <p>
                AORMS (the "Service") is a hosted software-as-a-service product provided by
                Human Centric Works ("we", "us") to architecture practices and their
                authorised users, under a commercial subscription.
              </p>

              <h2>2. Accounts and acceptable use</h2>
              <p>
                You are responsible for your account credentials and for the activity of users you
                invite. You agree not to misuse the Service — no reverse engineering, resale,
                unauthorised access, or use that violates applicable law. We may suspend access for
                breach.
              </p>

              <h2>3. Your data</h2>
              <p>
                Your projects, drawings, invoices, and client data remain yours. We process them
                only to provide the Service on our cloud infrastructure at aorms.in. We do not sell your data.
              </p>

              <h2>4. Model training and your data</h2>
              <p>
                We do not use your project, drawing, invoice or client data to train third-party
                models without a separate agreement. Operational records are processed only to
                provide the Service. We do not sell your data.
              </p>
              <p>
                If you use a <strong>bring-your-own API key</strong> for Ask ESTI and AI Studio,
                inference runs on your chosen provider under their terms.
              </p>

              <h2>5. Privacy</h2>
              <p>
                We collect the minimum needed to run the Service — account details, usage, and the
                operational records you create. We do not share personal data with third parties
                except processors necessary to deliver the Service (e.g. hosting), or where required
                by law. You may request export or deletion of your data.
              </p>

              <h2>6. Availability and warranty</h2>
              <p>
                We work to keep the Service reliable but provide it "as is", without warranties of
                uninterrupted availability or fitness for a particular purpose, except as set out in
                your subscription agreement. Decision-support outputs (e.g. cost estimates, revision
                and risk signals) are guidance, not a substitute for professional judgement or
                statutory sanction.
              </p>

              <h2>7. Liability</h2>
              <p>
                To the extent permitted by law, our liability is limited as set out in your
                subscription agreement. We are not liable for indirect or consequential losses.
              </p>

              <h2>8. Intellectual property and licensing</h2>
              <p>
                AORMS and its source code are proprietary to Human Centric Works. The Service
                incorporates third-party open-source components under their respective licenses; see
                our third-party notices. Use of the Service grants no rights to our code beyond your
                subscription.
              </p>

              <h2>9. Governing law</h2>
              <p>
                These terms are governed by the laws of India, with jurisdiction in Karnataka, unless
                your subscription agreement states otherwise.
              </p>

              <h2 id="accessibility">10. Accessibility</h2>
              <p>
                AORMS marketing pages and the workspace target WCAG 2.1 Level AA where practical:
                semantic headings, keyboard navigation, focus indicators, and sufficient colour
                contrast via the HCW-UI-Kit token system. Report barriers at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>

              <h2>11. Contact</h2>
              <p>
                Human Centric Works · Hospet, Karnataka, India<br />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · +91 89510 89191
              </p>
            </div>
          </article>
      </div>
    </MarketingShell>
  );
}
