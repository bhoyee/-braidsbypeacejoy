// Style add-ons (isomorphic): hair upgrades priced per bundle + a flat color-mix fee.
// The browser uses this to show a live total; the checkout API recomputes it from
// the database, so the price can never be changed client-side.
import { formatUSD } from "./time";

export const HAIR_OPTIONS = [
  { id: "included", label: "Braiding hair included", note: "Standard braiding hair — no extra cost", perBundleCents: 0 },
  { id: "own", label: "I'll bring my own hair", note: "No extra cost", perBundleCents: 0 },
  { id: "blended", label: "Blended hair", note: "$50 per bundle", perBundleCents: 5000 },
  { id: "human", label: "100% human hair", note: "$80 per bundle", perBundleCents: 8000 },
] as const;

export type HairOptionId = (typeof HAIR_OPTIONS)[number]["id"];

export const COLOR_MIX_CENTS = 2000; // mix of two or more colors
export const MAX_BUNDLES = 8;
export const DEFAULT_BUNDLES = 1; // the client adds more with +

export type AddOnSelection = {
  hair: HairOptionId;
  bundles?: number; // only used when the style has no fixed bundle count
  colorMix: boolean;
};

export const NO_ADDONS: AddOnSelection = { hair: "included", colorMix: false };

export type AddOnLine = { label: string; cents: number };

export type AddOnQuote = {
  lines: AddOnLine[];
  totalCents: number;
  bundles: number;
  /** One-line summary for emails / admin, e.g. "100% human hair × 4 bundles; 2+ colors". */
  summary: string;
};

/** Price the add-ons. The client always chooses the number of bundles (1–MAX_BUNDLES). */
export function quoteAddOns(sel: AddOnSelection): AddOnQuote {
  const option = HAIR_OPTIONS.find((o) => o.id === sel.hair) ?? HAIR_OPTIONS[0];
  const bundles = clampBundles(sel.bundles ?? DEFAULT_BUNDLES);
  const lines: AddOnLine[] = [];
  const summary: string[] = [];

  if (option.perBundleCents > 0) {
    lines.push({ label: `${option.label} × ${bundles} bundle${bundles > 1 ? "s" : ""}`, cents: option.perBundleCents * bundles });
    summary.push(`${option.label} × ${bundles} bundle${bundles > 1 ? "s" : ""} (${formatUSD(option.perBundleCents)} each)`);
  } else if (option.id === "own") {
    summary.push("Bringing own hair");
  }
  if (sel.colorMix) {
    lines.push({ label: "Mix of 2+ colors", cents: COLOR_MIX_CENTS });
    summary.push("Mix of 2+ colors");
  }

  return {
    lines,
    totalCents: lines.reduce((sum, l) => sum + l.cents, 0),
    bundles,
    summary: summary.join("; ") || "None",
  };
}

/** Human-readable add-ons stored on a booking row ("" when none). */
export function addOnsSummary(b: { addOns: unknown }): string {
  const summary = (b.addOns as { summary?: string } | null)?.summary;
  return summary && summary !== "None" ? summary : "";
}

export function clampBundles(n: number) {
  return Math.min(MAX_BUNDLES, Math.max(1, Math.round(n) || 1));
}

/* ------------------------------------------------------------------ */
/* Per-style hair rules (Service.hair, set in src/content/styles.ts)   */
/* ------------------------------------------------------------------ */

/** "included" = normal options · "bring" = hair not provided, client brings it · "none" = no add-ons at all. */
export type HairPolicy = "included" | "bring" | "none";

export const asHairPolicy = (v: string | null | undefined): HairPolicy => (v === "bring" || v === "none" ? v : "included");

/** The hair options a style offers. */
export function hairOptionsFor(policy: HairPolicy) {
  if (policy === "none") return [];
  if (policy === "bring") return HAIR_OPTIONS.filter((o) => o.id === "own");
  return [...HAIR_OPTIONS];
}

/** Starting selection for a style. */
export function defaultAddOns(policy: HairPolicy): AddOnSelection {
  return { hair: policy === "bring" ? "own" : "included", colorMix: false };
}

/** Forces a selection to fit the style's rules (used by the browser AND re-checked at checkout). */
export function normalizeAddOns(sel: AddOnSelection, policy: HairPolicy): AddOnSelection {
  if (policy === "none") return { hair: "included", colorMix: false };
  const allowed = hairOptionsFor(policy).some((o) => o.id === sel.hair);
  return allowed ? sel : { ...sel, hair: defaultAddOns(policy).hair };
}
