// ─────────────────────────────────────────────────────────────────────────────
// FREQUENTLY ASKED QUESTIONS: edit this list to add or change questions.
//
// • topic   one of the TOPICS ids below (the tabs on the FAQ page).
// • home    true = also shown on the home page (keep it to ~5).
// • link    optional "read more" link, so answers stay short instead of
//           repeating whole policies.
//
// The same list feeds the home page, the /faq page, Google (structured data)
// and AI assistants (/llms.txt). Commit and push to main to publish changes.
// ─────────────────────────────────────────────────────────────────────────────
import { DEPOSIT_CENTS, SALON } from "@/lib/config";
import { formatUSD } from "@/lib/time";

export const TOPICS = [
  { id: "booking", label: "Booking & Deposit" },
  { id: "payments", label: "Payments" },
  { id: "preparing", label: "Preparing" },
  { id: "styles", label: "Styles & Hair" },
  { id: "visit", label: "Location & Hours" },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

export type Faq = {
  topic: TopicId;
  q: string;
  a: string;
  home?: boolean;
  link?: { href: string; label: string };
};

const deposit = formatUSD(DEPOSIT_CENTS);

export const FAQS: Faq[] = [
  // Booking & Deposit
  {
    topic: "booking",
    home: true,
    q: "How do I book an appointment?",
    a: `Choose your style, pick an open date and time, and pay the ${deposit} deposit to lock your slot — it takes a few minutes. You can also call or text ${SALON.phone}.`,
    link: { href: "/book", label: "Book now" },
  },
  {
    topic: "booking",
    home: true,
    q: "Is a deposit required, and is it refundable?",
    a: `Yes. A strict, non-refundable ${deposit} deposit secures your slot and counts toward your total price. A no call / no show forfeits the deposit.`,
    link: { href: "/policies#deposit", label: "Deposit policy" },
  },
  {
    topic: "booking",
    home: true,
    q: "Can I cancel or reschedule?",
    a: `Yes — reply to your confirmation email or text ${SALON.phone} at least 72 hours before your appointment. Later cancellations need a new deposit to book again.`,
    link: { href: "/policies#cancellation", label: "Cancellation policy" },
  },

  // Payments
  {
    topic: "payments",
    home: true,
    q: "What payment methods do you accept?",
    a: `Online: Visa, Mastercard, American Express, Discover, Apple Pay and Link, processed securely by Stripe. Deposits can also be sent by Cash App (${SALON.cashApp}) or Zelle (${SALON.zelle}) — text us to book that way.`,
  },
  {
    topic: "payments",
    q: "How do I pay the rest of my balance?",
    a: `Pay online at any time with the email you booked with or your booking code, send it by Cash App (${SALON.cashApp}) or Zelle (${SALON.zelle}) with your booking code in the note, or pay at your appointment.`,
    link: { href: "/pay", label: "Pay your balance" },
  },

  // Preparing
  {
    topic: "preparing",
    q: "How should I prepare for my appointment?",
    a: "Arrive with your hair washed and blow-dried, with no oil or product applied. Your hair should be at least 4 inches long.",
    link: { href: "/policies#hair-condition", label: "Hair preparation" },
  },
  {
    topic: "preparing",
    q: "What if I'm running late?",
    a: `Please call or text ${SALON.phone} as soon as you can so we can plan around it.`,
  },
  {
    topic: "preparing",
    q: "I have an allergy to braiding hair or products. What should I do?",
    a: "Tell us before your appointment — add it in the notes when you book, or text us — so we can use suitable hair and products.",
  },

  // Styles & Hair
  {
    topic: "styles",
    q: "What styles do you offer?",
    a: "Knotless braids, boho and curly styles, box braids, cornrows and stitch braids, twists and locs, and kids styles. Browse the full menu by category.",
    link: { href: "/styles", label: "See all styles" },
  },
  {
    topic: "styles",
    q: "Is braiding hair included in the price?",
    a: "Yes, except for passion twists and crochet styles. When you book you can upgrade to 100% human hair ($80 per bundle) or blended hair ($50 per bundle), or bring your own. A mix of 2+ colors adds $20.",
    link: { href: "/policies#pricing", label: "Pricing & hair" },
  },
  {
    topic: "styles",
    q: "Do you braid children's hair?",
    a: "Yes — see the Kids category on the style menu.",
    link: { href: "/styles?category=kids", label: "Kids styles" },
  },

  // Location & Hours
  {
    topic: "visit",
    home: true,
    q: "Where are you located?",
    a: `Inside PHENIX Salon Suites at 8700 Liberty Rd, Suite 101, Randallstown, MD 21133.`,
    link: { href: SALON.mapsUrl, label: "Open in Google Maps" },
  },
  {
    topic: "visit",
    q: "What are your opening hours?",
    a: "Monday to Sunday, 8:00 AM to 7:00 PM, by appointment. Every style is scheduled to finish by 7:00 PM.",
  },
];
