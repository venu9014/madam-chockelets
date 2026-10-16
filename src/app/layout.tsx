import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MADAM CHOCOLATE — Digital Operations Platform",
  description:
    "Centralized digital operations system for Madam Chocolate multi-branch luxury confectionery, inventory ledger, SOP adherence, and staff governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
