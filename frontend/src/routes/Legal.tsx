import { useEffect } from "react";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";

const CONTACT_EMAIL = "hi@aorms.in";

export function Legal() {
  useEffect(() => {
    const title = "Legal — AORMS";
    const description =
      "Terms of service, privacy policy, acceptable use, and licensing for AORMS by Holagundi Consulting Works.";
    document.title = title;
    const set = (sel: string, attr: "content" | "href", val: string) =>
      document.querySelector(sel)?.setAttribute(attr, val);
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('link[rel="canonical"]', "href", `${window.location.origin}/legal`);
  }, []);

  return (
      <MarketingShell>
        <main id="main-content" className="esti-blog">
          <header className="esti-blog__head">
            <h1>Legal</h1>
            <p>
              Terms of service, privacy, acceptable use, and licensing for AORMS, operated by
              Holagundi Consulting Works.
            </p>
          </header>

          <article className="esti-blog-article">
            <div className="esti-blog-article__body">
              <p>
                <em>Last updated: 2026. This is a plain-language summary; the binding terms are
                those in your signed subscription agreement. For a tailored agreement, contact
                us.</em>
              </p>

              <h2>1. Service</h2>
              <p>
                AORMS (the "Service") is a hosted software-as-a-service product provided by
                Holagundi Consulting Works ("we", "us") to architecture practices and their
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
                only to provide the Service. On a self-hosted deployment, your data stays entirely
                on your own infrastructure. We do not sell your data.
              </p>

              <h2>4. Use of free-tier data for model training</h2>
              <p>
                <strong>AORMS-Lite (the free edition) does not include AI, LLM or ML
                features, construction / PMC and tendering, GST-specific invoicing
                (CGST/SGST split, SAC code, FY-sequential numbering) or GST returns and
                26AS / AIS / GSTR reconciliation.</strong> Lite supports simple non-GST
                invoices and basic bank reconciliation for firms below the GST
                registration threshold. In exchange for providing
                AORMS-Lite at no cost, you grant Holagundi Consulting Works a licence to use the
                data you create in AORMS-Lite — in de-identified and aggregated form — to develop,
                train and improve our artificial intelligence, large-language and machine-learning
                models. We take reasonable steps to strip direct identifiers (names, contacts, and
                other personal data) before any such use, and we do not sell this data.
              </p>
              <p>
                This applies <strong>only to the free AORMS-Lite tier</strong>. Data in the paid
                edition (AORMS-Pro) and in self-hosted deployments is
                <strong> never used to train our models</strong>. Upgrading to a paid edition, or
                self-hosting, opts you out of model-training use entirely. Where the law requires
                consent for such processing, your acceptance of these terms on the free tier
                constitutes that consent, and you may withdraw it by upgrading or by ceasing use of
                AORMS-Lite.
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
                AORMS and its source code are proprietary to Holagundi Consulting Works. The Service
                incorporates third-party open-source components under their respective licenses; see
                our third-party notices. Use of the Service grants no rights to our code beyond your
                subscription.
              </p>

              <h2>9. Governing law</h2>
              <p>
                These terms are governed by the laws of India, with jurisdiction in Karnataka, unless
                your subscription agreement states otherwise.
              </p>

              <h2>10. Contact</h2>
              <p>
                Holagundi Consulting Works · Hospet, Karnataka, India<br />
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · +91 89510 89191
              </p>
            </div>
          </article>
        </main>
        <MarketingFooter />
      </MarketingShell>
  );
}
