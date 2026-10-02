"use client";

import { useEffect } from "react";

/** On phones the tab row scrolls sideways; bring the selected tab into view. */
export function RevealActiveTab({ selector }: { selector: string }) {
  useEffect(() => {
    document.querySelector(selector)?.scrollIntoView({ block: "nearest", inline: "center" });
  });
  return null;
}
