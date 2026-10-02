"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

/**
 * Link to a section ("/#styles"). Next's router ignores a click when the URL
 * already ends in that hash, so on the home page we scroll ourselves — every click works.
 */
export function AnchorLink({ href, onClick, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    const [path, hash] = href.split("#");
    if (!hash || (path || "/") !== pathname) return; // different page → normal navigation
    const target = document.getElementById(hash);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${hash}`);
  };

  return <Link href={href} onClick={handleClick} {...rest} />;
}
