import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";

const serif = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GTC Agent",
  description: "Your AI guide to hardware manufacturing in Shenzhen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${serif.variable} ${sans.variable} font-sans antialiased bg-[#f5f0eb] text-[#1a1a1a]`}
      >
        {children}
      </body>
    </html>
  );
}
