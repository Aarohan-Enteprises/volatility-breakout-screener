import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://vbc.pinecoder.in";
const title = "Volatility Breakout Screener | Delta Exchange";
const description =
  "Real-time crypto volatility breakout screener for Delta Exchange. Detect low volatility compression followed by expansion using Bollinger Bands + ATR on perpetual futures.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "volatility breakout",
    "crypto screener",
    "Delta Exchange",
    "Bollinger Bands",
    "ATR",
    "volatility compression",
    "perpetual futures",
    "crypto trading",
    "breakout screener",
    "trading signals",
  ],
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  applicationName: "Volatility Breakout Screener",
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Volatility Breakout Screener",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  other: {
    "theme-color": "#0a0a0a",
  },
  manifest: "/manifest.json",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Volatility Breakout Screener",
  description,
  url: siteUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BE8L865HWT"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-BE8L865HWT');`}
        </Script>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
