import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { SALON } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Braids by Peace Joy collects, uses and protects your personal information when you book or pay online.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your information"
      title="Privacy Policy"
      intro="We only collect what we need to book and serve you, and we never sell your information."
      updated="October 2026"
      current="/privacy"
    >
      <div className="space-y-5">
        <LegalSection title="What we collect">
          <ul>
            <li>Booking details: your name, email address, mobile phone number, chosen style, appointment date and time, and any notes you give us (for example allergies).</li>
            <li>Payment records: amounts paid and payment status. Card details are entered directly with our payment processor, Stripe — we never see or store your full card number.</li>
            <li>Basic technical data your browser sends when you visit (such as IP address and device type), used to run and secure the website.</li>
          </ul>
        </LegalSection>

        <LegalSection title="How we use it">
          <ul>
            <li>To schedule, confirm and manage your appointment, and to take deposits and balance payments.</li>
            <li>To send booking confirmations, payment receipts and appointment reminders by email.</li>
            <li>To prepare for your appointment safely — for example, allergy information you share.</li>
            <li>To respond to your questions and keep business and tax records.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Who we share it with">
          <p>We do not sell or rent your personal information. We share it only with services that help us run the business:</p>
          <ul>
            <li>Stripe, to process online payments securely.</li>
            <li>Our email provider, to send confirmations and reminders.</li>
            <li>Our website hosting providers, which store booking records securely.</li>
          </ul>
          <p>We may also disclose information when required by law.</p>
        </LegalSection>

        <LegalSection title="How long we keep it">
          <p>
            We keep booking and payment records for as long as needed to provide our services and to meet legal, tax and accounting
            requirements.
          </p>
        </LegalSection>

        <LegalSection title="Your choices">
          <ul>
            <li>You can ask us to see, correct or delete the personal information we hold about you, subject to records we must keep by law.</li>
            <li>You can opt out of reminder emails at any time by telling us.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Children">
          <p>
            Appointments for children must be booked by a parent or guardian, who provides the contact details. We do not knowingly
            collect information directly from children under 13.
          </p>
        </LegalSection>

        <LegalSection title="Contact us">
          <p>
            Questions about your privacy? Call or text <a href={SALON.phoneHref}>{SALON.phone}</a>, or visit us at {SALON.fullAddress}.
          </p>
        </LegalSection>
      </div>
    </LegalPage>
  );
}
