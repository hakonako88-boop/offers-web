import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AnalyticsConsent from "./components/AnalyticsConsent";
import { adsenseClientId, adsenseEnabled } from "./lib/adsense";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://chollosaldia.com"),
  title: { default: "Chollos al Día | Chollos, ofertas y cupones de hoy", template: "%s | Chollos al Día" },
  description: "Chollos de hoy, descuentos claros, cupones y enlaces directos para comprar mejor cada día.",
  applicationName: "Chollos al Día",
  keywords: ["chollos", "ofertas de hoy", "descuentos", "cupones", "ofertas AliExpress", "ofertas Amazon", "ahorro"],
  authors: [{ name: "Chollos al Día" }],
  creator: "Chollos al Día",
  publisher: "Chollos al Día",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/favicon-192.png", sizes: "192x192", type: "image/png" }],
  },
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Chollos al Día",
    title: "Chollos al Día | Chollos, ofertas y cupones de hoy",
    description: "Chollos seleccionados, precios claros y enlaces directos para comprar mejor.",
    images: [{ url: "/og-chollosaldia-v2.png", width: 1731, height: 909, alt: "Chollos al Día, ofertas verificadas y ahorro real" }],
  },
  twitter: { card: "summary_large_image", title: "Chollos al Día", description: "Ofertas verificadas y ahorro real.", images: ["/og-chollosaldia-v2.png"] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  category: "shopping",
  ...(adsenseEnabled ? { other: { "google-adsense-account": adsenseClientId } } : {}),
};

export const viewport: Viewport = { themeColor: "#18213e", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        {adsenseEnabled && (
          <script
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<AnalyticsConsent /></body>
    </html>
  );
}
