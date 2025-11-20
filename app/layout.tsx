import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocationProvider } from "@/lib/contexts/LocationContext";

export const metadata: Metadata = {
  title: "Bright Ops | Home Base",
  description: "Home base and workspace for Bright Ops operations",
};

// Performance optimization
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&family=Playfair+Display:wght@400;600;700&display=swap" 
          rel="stylesheet"
          // Optimize font loading
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ fontFamily: "'Source Sans Pro', sans-serif", background: 'var(--color-bg-page)', color: 'var(--color-text-main)', margin: 0 }}>
        <LocationProvider>
          {children}
        </LocationProvider>
      </body>
    </html>
  );
}
