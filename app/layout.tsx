import type { Metadata } from "next";
import "./globals.css";

const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata: Metadata = {
  other: {
    ...(ADSENSE_ID && { 'google-adsense-account': ADSENSE_ID }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
