// The salon's own booking policies (from the Braids by Peace Joy policy sheet).
// One source for the Policies page, the home-page checklist, the FAQ, JSON-LD and /llms.txt.
import { SALON } from "./config";

export const CANCEL_NOTICE_HOURS = 72;

/** "Before your appointment" checklist — short lines for the home page and emails. */
export const PREP_CHECKLIST = [
  { title: "Wash & blow-dry", body: "Please arrive with your hair washed and blow-dried." },
  { title: "No oil or product", body: "Don't put oil or any product in your hair before your session." },
  { title: "At least 4 inches", body: "Your natural hair must be at least 4 inches long." },
  { title: "Tell us about allergies", body: "Let us know about any known allergy to braiding hair or products." },
  { title: "Running late?", body: `Please call or text ${SALON.phone} so we can plan around it.` },
  { title: "Bring hair or add it on", body: "Braiding hair is included for most styles — upgrade to human or blended hair when you book, or bring your own." },
] as const;

export type PolicySection = { id: string; title: string; points: string[] };

export const BOOKING_POLICIES: PolicySection[] = [
  {
    id: "deposit",
    title: "Deposit",
    points: [
      "A $30.00 deposit is required to secure and keep every appointment. Your slot is not reserved until the deposit is paid.",
      "Pay the deposit online by card, Apple Pay or Link when you book on this website — your time is locked instantly.",
      `Prefer Cash App (${SALON.cashApp}) or Zelle (${SALON.zelle})? Text ${SALON.phone} to book that way; your appointment is confirmed once we receive the deposit.`,
      "The deposit is non-refundable and counts toward the total price of your style.",
      "No call / no show = appointment canceled, and the deposit is automatically forfeited.",
    ],
  },
  {
    id: "cancellation",
    title: "Cancellation & rescheduling",
    points: [
      `To cancel or reschedule, reply to your confirmation email or text ${SALON.phone} at least ${CANCEL_NOTICE_HOURS} hours before your appointment.`,
      `If you cancel less than ${CANCEL_NOTICE_HOURS} hours before your appointment, you will need to pay a new deposit to book again.`,
    ],
  },
  {
    id: "pricing",
    title: "Pricing",
    points: [
      "All prices include braiding hair, except kinky twists, passion twists and crochet (please bring your own hair). For Bora Bora and Mermaid braids, please bring your boho (curly) hair.",
      "A mix of two or more colors adds $20.",
      "Final price may change based on the length and size of the braids you choose.",
    ],
  },
  {
    id: "hair-condition",
    title: "Hair condition",
    points: [
      "Please have your hair washed and blow-dried before your appointment.",
      "Do not put oil or any product in your hair before your session.",
      "Your hair must be at least 4 inches long.",
      `If you are running late, please call or text ${SALON.phone}.`,
    ],
  },
  {
    id: "hair-addons",
    title: "Hair add-ons",
    points: [
      "Bora Bora braids use 4 bundles of hair; mermaid braids use 3 bundles.",
      "100% human hair: $80 per bundle. Blended hair: $50 per bundle.",
      "Choose your hair upgrade and number of bundles when you book online — it is added to your total — or bring your own hair along.",
    ],
  },
  {
    id: "allergies",
    title: "Allergies",
    points: [
      "It is important to tell us about any known allergy to braiding hair or hair products before your appointment. Add it in the notes when you book, or text us.",
    ],
  },
  {
    id: "agreement",
    title: "Agreement",
    points: ["By booking with Braids by Peace Joy, you are agreeing to all of these policies and our Terms & Conditions."],
  },
];
