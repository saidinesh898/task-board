import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import styles from "./layout.module.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://board-systems-lab-sai.saidinesh898.chatgpt.site"),
  title: "Thomson Reuters Board · Collaborative tasks",
  description: "A high-performance collaborative task board.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Board Systems Lab",
    title: "Board Systems Lab · React task board",
    description: "Explore the architecture, patterns, and code behind a virtualized collaborative React task board.",
    images: [{
      url: "/og.png",
      width: 1744,
      height: 909,
      alt: "Board Systems Lab with an illustrated three-column task board",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Systems Lab · React task board",
    description: "Interactive React architecture lessons, dnd-kit, and TanStack Virtual.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${styles.html}`}
    >
      <body className={styles.style1} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
