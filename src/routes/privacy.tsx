import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-semibold">Breezy Plans</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: May 24, 2026</p>
        </div>

        {/* Intro */}
        <div className="mb-8 text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>
            This Privacy Policy describes how Breezy Plans ("we," "us," or "our") collects, uses,
            and shares your personal information when you use our services, including our website at{" "}
            <a
              href="https://breezy-travels.edmund-tam23.workers.dev/"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://breezy-travels.edmund-tam23.workers.dev/
            </a>
            .
          </p>
          <p>
            <strong className="text-foreground">Questions or concerns?</strong> If you do not agree
            with our policies and practices, please do not use our Services. If you have any
            questions, please contact us at{" "}
            <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
              edmund.tam23@gmail.com
            </a>
            .
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-10 p-5 rounded-lg border bg-muted/40">
          <h2 className="text-sm font-semibold text-foreground mb-3">Table of Contents</h2>
          <ol className="space-y-1.5 text-sm text-primary">
            {[
              ["#infocollect", "1. What Information Do We Collect?"],
              ["#infouse", "2. How Do We Process Your Information?"],
              ["#legalbases", "3. What Legal Bases Do We Rely On?"],
              ["#whoshare", "4. When and With Whom Do We Share Your Information?"],
              ["#cookies", "5. Do We Use Cookies and Tracking Technologies?"],
              ["#ai", "6. Do We Offer AI-Based Products?"],
              ["#sociallogins", "7. How Do We Handle Your Social Logins?"],
              ["#inforetain", "8. How Long Do We Keep Your Information?"],
              ["#infosafe", "9. How Do We Keep Your Information Safe?"],
              ["#infominors", "10. Do We Collect Information From Minors?"],
              ["#privacyrights", "11. What Are Your Privacy Rights?"],
              ["#DNT", "12. Controls for Do-Not-Track Features"],
              ["#uslaws", "13. Do United States Residents Have Specific Privacy Rights?"],
              ["#policyupdates", "14. Do We Make Updates to This Notice?"],
              ["#contact", "15. How Can You Contact Us?"],
              ["#request", "16. How Can You Review, Update, or Delete Your Data?"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          <Section id="infocollect" title="1. What Information Do We Collect?">
            <SubSection title="Personal information you provide to us">
              <p>We collect personal information you voluntarily provide when you register, express interest in our services, participate in activities, or contact us. This includes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Names</li>
                <li>Email addresses</li>
                <li>Usernames</li>
                <li>Passwords</li>
                <li>Contact or authentication data</li>
                <li>Usage data</li>
              </ul>
              <p>We do not process sensitive personal information.</p>
            </SubSection>
            <SubSection title="Social Media Login Data">
              <p>
                If you register using a social media account (such as Google), we will collect
                certain profile information from that provider, including your name, email address,
                and profile picture. See section 7 for more details.
              </p>
            </SubSection>
            <SubSection title="Information automatically collected">
              <p>
                We automatically collect certain information when you visit or use our Services,
                including your IP address, browser type, device characteristics, operating system,
                language preferences, referring URLs, and information about how and when you use
                our Services. This information is primarily used to maintain the security and
                operation of our Services.
              </p>
              <p>
                We also collect location data based on your IP address to help provide map and
                itinerary features.
              </p>
            </SubSection>
            <SubSection title="Google API">
              <p>
                Our use of information received from Google APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </SubSection>
          </Section>

          <Section id="infouse" title="2. How Do We Process Your Information?">
            <p>We process your information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Facilitate account creation, authentication, and account management</li>
              <li>Deliver and improve our Services</li>
              <li>Identify usage trends to improve the product</li>
              <li>Deliver targeted advertising (if applicable in the future)</li>
              <li>Protect against security threats and fraud</li>
              <li>Comply with legal obligations</li>
              <li>Protect an individual's vital interests when necessary</li>
            </ul>
          </Section>

          <Section id="legalbases" title="3. What Legal Bases Do We Rely On?">
            <p>
              We only process your personal information when we have a valid legal reason to do so.
              Depending on your location, we may rely on:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-foreground">Consent</strong> — when you have given us
                permission for a specific purpose
              </li>
              <li>
                <strong className="text-foreground">Legitimate Interests</strong> — when necessary
                to achieve our business interests without overriding your rights
              </li>
              <li>
                <strong className="text-foreground">Legal Obligations</strong> — when required by
                law
              </li>
              <li>
                <strong className="text-foreground">Vital Interests</strong> — when necessary to
                protect someone's safety
              </li>
            </ul>
            <p>
              If you are located in the EU, UK, Switzerland, or Canada, you have the right to
              withdraw consent at any time by contacting us at{" "}
              <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
                edmund.tam23@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section id="whoshare" title="4. When and With Whom Do We Share Your Information?">
            <p>We may share your information in the following situations:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-foreground">Business Transfers</strong> — in connection
                with a merger, sale, or acquisition of our business
              </li>
              <li>
                <strong className="text-foreground">Google Maps Platform</strong> — we share
                location data with Google Maps APIs (Maps JavaScript API, Places API, Directions
                API) to power map features. Google Maps uses GPS, Wi-Fi, and cell towers to
                estimate location.
              </li>
            </ul>
            <p>
              We have not sold or shared personal information to third parties for commercial
              purposes in the past 12 months and will not do so in the future.
            </p>
          </Section>

          <Section id="cookies" title="5. Do We Use Cookies and Tracking Technologies?">
            <p>
              We use cookies and similar tracking technologies to maintain the security of our
              Services, prevent crashes, fix bugs, save your preferences, and assist with basic
              site functions. We also use Cloudflare Turnstile, which uses cookies for bot
              protection.
            </p>
            <p>
              We may permit third-party service providers to use tracking technologies for
              analytics purposes. To the extent these technologies are considered a "sale" or
              "sharing" under applicable US state laws, you may opt out by contacting us.
            </p>
          </Section>

          <Section id="ai" title="6. Do We Offer AI-Based Products?">
            <p>
              Yes. Breezy Plans uses artificial intelligence to generate travel itineraries and
              location descriptions. We provide these features through Google Cloud AI (Gemini).
              Your travel prompts and inputs are processed by Google's AI services to generate
              itinerary content.
            </p>
            <p>
              All personal information processed using our AI features is handled in line with
              this Privacy Policy and our agreements with third-party AI providers. You must not
              use our AI features in any way that violates Google's terms or policies.
            </p>
          </Section>

          <Section id="sociallogins" title="7. How Do We Handle Your Social Logins?">
            <p>
              Our Services allow you to register and log in using your Google account. When you
              do, we receive certain profile information from Google, which may include your name,
              email address, and profile picture. We use this information only as described in
              this Privacy Policy.
            </p>
            <p>
              We are not responsible for how Google uses your information. We recommend reviewing
              Google's Privacy Policy to understand their data practices.
            </p>
          </Section>

          <Section id="inforetain" title="8. How Long Do We Keep Your Information?">
            <p>
              We keep your personal information for as long as your account is active or as needed
              to provide our Services. When we have no ongoing legitimate business need to process
              your information, we will delete or anonymize it. If deletion is not immediately
              possible (such as data in backup archives), we will securely store and isolate it
              until deletion is possible.
            </p>
          </Section>

          <Section id="infosafe" title="9. How Do We Keep Your Information Safe?">
            <p>
              We implement appropriate technical and organizational security measures to protect
              your personal information, including encrypted data transmission, authentication
              controls, and access restrictions. However, no electronic transmission over the
              internet can be guaranteed to be 100% secure. You should only access our Services
              within a secure environment.
            </p>
          </Section>

          <Section id="infominors" title="10. Do We Collect Information From Minors?">
            <p>
              We do not knowingly collect data from or market to children under 18 years of age.
              By using our Services, you represent that you are at least 18 years old. If we
              learn that we have collected personal information from a minor, we will deactivate
              the account and delete the data. If you are aware of any such data, please contact
              us at{" "}
              <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
                edmund.tam23@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section id="privacyrights" title="11. What Are Your Privacy Rights?">
            <p>
              Depending on your location, you may have the right to access, correct, or delete
              your personal information, restrict or object to processing, and withdraw consent.
              You can exercise these rights by contacting us at{" "}
              <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
                edmund.tam23@gmail.com
              </a>
              .
            </p>
            <SubSection title="Account Information">
              <p>
                You may review or update your account information by logging into your account
                settings. Upon requesting account termination, we will deactivate or delete your
                account and information from our active databases, though we may retain some
                information for fraud prevention or legal compliance purposes.
              </p>
            </SubSection>
            <p>
              If you are in the EEA or UK and believe we are unlawfully processing your personal
              information, you have the right to complain to your local data protection authority.
            </p>
          </Section>

          <Section id="DNT" title="12. Controls for Do-Not-Track Features">
            <p>
              Most web browsers include a Do-Not-Track ("DNT") setting. Because there is currently
              no uniform technology standard for recognizing DNT signals, we do not respond to
              them at this time. If a standard is adopted that we are required to follow, we will
              update this Privacy Policy accordingly.
            </p>
          </Section>

          <Section id="uslaws" title="13. Do United States Residents Have Specific Privacy Rights?">
            <p>
              If you are a resident of California, Colorado, Connecticut, or other US states with
              applicable privacy laws, you may have additional rights including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Right to know whether we are processing your personal data</li>
              <li>Right to access your personal data</li>
              <li>Right to correct inaccuracies in your personal data</li>
              <li>Right to request deletion of your personal data</li>
              <li>Right to obtain a copy of personal data you previously shared with us</li>
              <li>Right to non-discrimination for exercising your rights</li>
              <li>Right to opt out of targeted advertising or sale of personal data</li>
            </ul>
            <p>
              To exercise these rights, email us at{" "}
              <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
                edmund.tam23@gmail.com
              </a>
              . We will respond in accordance with applicable law. If your request is denied, you
              may appeal by emailing us and, if the appeal is denied, submit a complaint to your
              state attorney general.
            </p>
          </Section>

          <Section id="policyupdates" title="14. Do We Make Updates to This Notice?">
            <p>
              We may update this Privacy Policy from time to time to stay compliant with relevant
              laws. The updated version will be indicated by an updated date at the top of this
              page. We encourage you to review this Privacy Policy periodically.
            </p>
          </Section>

          <Section id="contact" title="15. How Can You Contact Us?">
            <p>
              If you have questions or comments about this Privacy Policy, you may contact us at:
                <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
                  edmund.tam23@gmail.com
                </a>
                .
              </p>
          </Section>

          <Section id="request" title="16. How Can You Review, Update, or Delete Your Data?">
            <p>
              Based on applicable laws, you may have the right to request access to, correction
              of, or deletion of the personal information we collect from you. To make such a
              request, please email us at{" "}
              <a href="mailto:edmund.tam23@gmail.com" className="text-primary hover:underline">
                edmund.tam23@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-8 border-t text-xs text-muted-foreground">
          <p>This Privacy Policy was last updated on May 24, 2026.</p>
        </div>
      </main>
    </div>
  );
}