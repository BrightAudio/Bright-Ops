import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocationProvider } from "@/lib/contexts/LocationContext";

export const metadata: Metadata = {
  title: "Bright Ops | Home Base",
  description: "Home base and workspace for Bright Ops operations",
};

// Performance optimization - revalidate static content
export const revalidate = 3600; // Revalidate every hour

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link 
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link 
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&family=Playfair+Display:wght@400;600;700&display=swap" 
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Source Sans Pro', sans-serif", background: 'var(--color-bg-page)', color: 'var(--color-text-main)', margin: 0, overflowX: 'hidden', maxWidth: '100vw' }}>
        <LocationProvider>
          {children}
        </LocationProvider>
      </body>
    </html>
  );
}
