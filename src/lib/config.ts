// Isomorphic (client + server safe) business constants.

export const SALON = {
  name: "Braidsbypeacejoy",
  addressLine: "8700 Liberty Rd, Randallstown, MD",
  suite: "PHENIX Salon Suite 101",
  fullAddress: "8700 Liberty Rd, Randallstown, MD (PHENIX Salon Suite 101)",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=8700+Liberty+Rd+Randallstown+MD+21133",
  // Opens the "write a review" box on the salon's Google listing (Braidsbypeacejoy LLC).
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJBaJWg6QZyIkR_uPkhDNgKwg",
  timeZone: "America/New_York",
  phone: "410-671-1788",
  phoneHref: "tel:+14106711788",
  smsHref: "sms:+14106711788",
  // Alternative deposit methods from the salon's booking policy.
  cashApp: "$peacejoybraids",
  cashAppUrl: "https://cash.app/$peacejoybraids",
  zelle: "410-671-1788",
  // Handles as printed on the storefront posters — verify the exact URLs.
  socials: {
    instagram: "https://www.instagram.com/braidsbypeacejoy",
    tiktok: "https://www.tiktok.com/@braidsby_peacejoy",
    youtube: "https://www.youtube.com/@Braidsbypeacejoy",
  },
} as const;

/** Header height (address strip 32px + nav 80px) — used to offset sticky/fixed content. */
export const HEADER_OFFSET_PX = 112;

export const DEPOSIT_CENTS = 3000; // $30.00 — strict, non-refundable
export const CURRENCY = "usd";

// Operating hours: Monday–Sunday, 8:00 AM – 7:00 PM (salon local time).
export const OPEN_MINUTE = 8 * 60; // 08:00
export const CLOSE_MINUTE = 19 * 60; // 19:00 — a service must FINISH by close
export const SLOT_STEP_MIN = 30; // granularity of bookable start times

export const MIN_LEAD_MINUTES = 120; // can't book a slot starting sooner than this
export const MAX_DAYS_AHEAD = 90; // how far out the calendar opens

// Stripe Checkout sessions must live >= 30 min; the slot hold matches it exactly
// so a session can never be paid after its hold has lapsed.
export const CHECKOUT_HOLD_MINUTES = 31;

export const REMINDER_MINUTES_BEFORE = 30;

export const DEPOSIT_POLICY =
  "⚠️ POLICY: A strict, non-refundable deposit of $30.00 USD is required upfront to secure and block your appointment slot.";
