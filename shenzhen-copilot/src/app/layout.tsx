import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shenzhen Co-Pilot",
  description: "Your AI guide to hardware manufacturing in Shenzhen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">{children}</body>
    </html>
  );
}
