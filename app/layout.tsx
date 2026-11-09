import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eyezheimer Clinical Console",
  description:
    "Local OCTA vessel segmentation research workflow. Disease classification is unavailable.",
  icons: {
    icon: "/thermoeye-logo-logoremovebg.png",
    apple: "/thermoeye-logo-logoremovebg.png",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
