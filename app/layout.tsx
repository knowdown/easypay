import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EasyPay — Workplace payments, simplified",
  description: "A secure employee app for piti contributions and organisation payments.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "EasyPay — Workplace payments, simplified",
    description: "Pay your share. Keep work moving.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "EasyPay workplace payment app" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyPay — Workplace payments, simplified",
    description: "Pay your share. Keep work moving.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
