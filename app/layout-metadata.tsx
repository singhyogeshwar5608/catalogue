import type { Metadata, Viewport } from "next";
import faviconIcon from '@/assets/icon-512x512.svg';

export const metadata: Metadata = {
  title: "Cateloge - Create Your Digital Store",
  description: "Build your online store in minutes. Boost your business with our powerful marketplace platform.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: faviconIcon.src, type: 'image/svg+xml' }],
    shortcut: [{ url: faviconIcon.src, type: 'image/svg+xml' }],
    apple: [{ url: faviconIcon.src }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};
