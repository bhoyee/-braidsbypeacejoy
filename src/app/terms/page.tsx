import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { SALON } from "@/lib/config";
import { CANCEL_NOTICE_HOURS } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for booking appointments and using the Braids by Peace Joy website.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The fine print"
      title="Terms & Conditions"
      intro={
        <>
          These terms apply when you book an appointment with Braids by Peace Joy or use this website. By booking, you agree to
          these terms and our <Link href="/policies" className="font-semibold text-gold-300 underline">Booking Policies</Link>.
        </>
      }
      updated="October 2026"
      current="/terms"
    >
      <div className="space-y-5">
        <LegalSection title="1. Who we are">
          <p>
            Braids by Peace Joy (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a hair braiding studio located at {SALON.fullAddress}.
            You can reach us by phone or text at <a href={SALON.phoneHref}>{SALON.phone}</a>.
          </p>
        </LegalSection>

        <LegalSection title="2. Appointments and deposits">
          <ul>
            <li>Every appointment requires a $30.00 deposit. Your time slot is reserved only once the deposit has been received.</li>
            <li>The deposit is non-refundable and is applied toward the total price of your service.</li>
            <li>Deposits paid online are processed by Stripe. Deposits may also be sent by Cash App ({SALON.cashApp}) or Zelle ({SALON.zelle}) when arranged with us by text.</li>
            <li>If you do not show up and do not contact us (&ldquo;no call / no show&rdquo;), your appointment is canceled and the deposit is forfeited.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Cancellations, rescheduling and lateness">
          <ul>
            <li>Cancel or reschedule at least {CANCEL_NOTICE_HOURS} hours before your appointment by replying to your confirmation email or texting {SALON.phone}.</li>
            <li>Cancellations made less than {CANCEL_NOTICE_HOURS} hours before the appointment require a new deposit to book again.</li>
            <li>If you are running late, please call or text us. Significant lateness may reduce the time available for your style or require rescheduling.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Prices and payment">
          <ul>
            <li>Prices shown on this website are in US dollars. All prices include braiding hair, except passion twists and crochet styles.</li>
            <li>The final price may change based on the length and size of braids requested. A mix of two or more colors adds $20. Hair add-ons (100% human hair $80 per bundle, blended hair $50 per bundle) are charged separately.</li>
            <li>The remaining balance is due at your appointment, or may be paid in advance online through our Pay Balance page.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Your responsibilities">
          <ul>
            <li>Arrive with your hair washed and blow-dried, with no oil or product applied. Hair must be at least 4 inches long.</li>
            <li>Tell us before your appointment about any known allergies or sensitivities to braiding hair or hair products. We are not responsible for reactions to products or materials that were not disclosed to us.</li>
            <li>Provide accurate contact details so we can confirm and remind you of your appointment.</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Results and aftercare">
          <p>
            Photos on this website show examples of our work; individual results vary with hair type, length and condition. Follow
            the aftercare advice we give you. If you have a concern about your style, please contact us promptly so we can help.
          </p>
        </LegalSection>

        <LegalSection title="7. Use of this website">
          <ul>
            <li>Content on this website, including photos, videos and the Braids by Peace Joy name and logo, belongs to us and may not be reused without permission.</li>
            <li>We work to keep availability, prices and information accurate, but they may change without notice. A booking is confirmed only when you receive our confirmation.</li>
            <li>To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of this website.</li>
          </ul>
        </LegalSection>

        <LegalSection title="8. Privacy">
          <p>
            How we collect and use your personal information is described in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </LegalSection>

        <LegalSection title="9. Changes and governing law">
          <p>
            We may update these terms from time to time; the version on this page applies to new bookings. These terms are governed
            by the laws of the State of Maryland, USA.
          </p>
        </LegalSection>
      </div>
    </LegalPage>
  );
}
