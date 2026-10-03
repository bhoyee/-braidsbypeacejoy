"use client";

import { usePathname } from "next/navigation";

/** Floating "Chat on WhatsApp" button. The number is resolved server-side by /api/whatsapp. */
export function WhatsAppButton() {
  const pathname = usePathname();
  return (
    <a
      href={`/api/whatsapp?from=${encodeURIComponent(pathname)}`}
      target="_blank"
      rel="noopener"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25d366] p-3.5 text-white shadow-[0_10px_30px_-8px_rgb(37_211_102/0.7)] transition hover:scale-105 hover:bg-[#1ebe5b] sm:bottom-6 sm:right-6 sm:pr-5"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M16.04 3C9 3 3.27 8.7 3.27 15.73c0 2.25.6 4.45 1.72 6.38L3 29l7.1-1.86a12.8 12.8 0 0 0 5.94 1.46h.01c7.03 0 12.76-5.7 12.76-12.73C28.8 8.7 23.07 3 16.04 3Zm0 23.3h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.21 1.1 1.12-4.1-.25-.42a10.5 10.5 0 0 1-1.62-5.6c0-5.84 4.77-10.6 10.76-10.6 5.86 0 10.62 4.76 10.62 10.6 0 5.85-4.77 10.73-10.62 10.73Zm5.83-7.94c-.32-.16-1.9-.93-2.19-1.04-.3-.1-.51-.16-.72.16-.22.32-.83 1.04-1.02 1.25-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.6-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.3.31-1.12 1.09-1.12 2.66 0 1.57 1.15 3.09 1.31 3.3.16.21 2.26 3.44 5.48 4.82.77.33 1.37.53 1.83.68.77.24 1.47.2 2.03.12.62-.09 1.9-.77 2.17-1.52.27-.75.27-1.39.19-1.52-.08-.14-.29-.21-.61-.37Z" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">Chat with us</span>
    </a>
  );
}
