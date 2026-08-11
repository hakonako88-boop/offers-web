import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://chollosaldia.com"),
  title: { default: "Chollos al Día | Ofertas verificadas y ahorro real", template: "%s | Chollos al Día" },
  description: "Ofertas verificadas, descuentos claros y enlaces directos para comprar mejor cada día.",
  applicationName: "Chollos al Día",
  keywords: ["chollos", "ofertas de hoy", "descuentos", "cupones", "ofertas AliExpress", "ofertas Amazon", "ahorro"],
  authors: [{ name: "Chollos al Día" }],
  creator: "Chollos al Día",
  publisher: "Chollos al Día",
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Chollos al Día",
    title: "Chollos al Día | Ofertas verificadas y ahorro real",
    description: "Chollos seleccionados, precios claros y enlaces directos para comprar mejor.",
    images: [{ url: "/og-chollosaldia.png", width: 1536, height: 1024, alt: "Chollos al Día, ofertas verificadas y ahorro real" }],
  },
  twitter: { card: "summary_large_image", title: "Chollos al Día", description: "Ofertas verificadas y ahorro real.", images: ["/og-chollosaldia.png"] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  category: "shopping",
};

export const viewport: Viewport = { themeColor: "#f04b37", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
