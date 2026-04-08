import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import Preconnect from "@/components/Preconnect";
import SupportChat from "@/components/SupportChat";

// Optimize font loading with display swap to prevent layout shift
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: "Investlyin - Professional CFD Trading Platform",
  description: "Investlyin - Leading global CFD trading platform with institutional-grade execution, real-time market data, and advanced trading tools.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Preconnect />
        <AuthProvider>
          <ToastProvider>
            {children}
            <SupportChat />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
