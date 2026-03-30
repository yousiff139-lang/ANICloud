import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { Providers } from "@/components/Providers";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "ANICloud | The Next-Gen Anime Aggregator",
  description: "Modern, high-performance anime streaming platform with automated content ingestion.",
  other: {
    'admaven-placement': 'BqjsHpjCE'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script 
          src="https://pl29012834.profitablecpmratenetwork.com/fa/04/4d/fa044d8118db908767b24b508db48cec.js"
          strategy="lazyOnload"
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-[#0B0E14]`} suppressHydrationWarning>
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
