// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bright Audio",
  description: "Bright Audio App Console",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f9fafb",
        }}
      >
        <nav
          style={{
            width: "100%",
            background: "#111",
            color: "#FFD700",
            padding: "0.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: 1 }}>
            Bright Audio Ops
          </span>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <a
              href="/scan"
              style={{
                color: "#FFD700",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Scan
            </a>
            <a
              href="/jobs"
              style={{
                color: "#FFD700",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Jobs
            </a>
            <a
              href="/api/pullsheet?jobCode=JOB-1001"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#FFD700",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Pull Sheet
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
