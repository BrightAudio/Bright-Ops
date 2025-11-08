import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
// app/layout.tsx
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bright Ops",
  description: "Bright Audio Operations Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <div className="app-container">
          <header className="top-bar">
            <Topbar />
          </header>
          <div className="main-area">
            <nav className="sidebar">
              <Sidebar />
            </nav>
            <section className="dashboard-content">{children}</section>
          </div>
        </div>
      </body>
    </html>
  );
}
