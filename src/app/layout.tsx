import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "EkolGlass B2B | Bayi Satış Portalı", template: "%s | EkolGlass B2B" },
  description: "EkolGlass bayi ürün, fiyat, stok, sipariş ve sevkiyat portalı.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "EkolGlass B2B",
    images: [{ url: "/ekolglass-commerce-hero.png", width: 1897, height: 829, alt: "EkolGlass otomotiv cam çözümleri" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 text-slate-950">{children}</body>
    </html>
  );
}
