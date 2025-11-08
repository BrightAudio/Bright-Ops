import Sidebar from "./Sidebar";
// app/layout.tsx
import "../app/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bright Ops",
  description: "Bright Audio App Console",
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
      <body className="bg-[#0a0b0d] text-white min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Bar */}
            <header className="sticky top-0 z-20 bg-[#0a0b0d]/80 backdrop-blur border-b border-white/10 flex items-center justify-between px-8 h-16">
              <span className="font-bold text-white/80 text-lg tracking-tight">My Personal Dashboard</span>
              <div className="flex gap-2">
                <button className="px-4 py-1 rounded-lg border border-white/10 text-white/70 bg-transparent hover:border-amber-400 hover:text-amber-300 transition-colors font-medium">Adjust layout</button>
                <button className="px-4 py-1 rounded-lg border border-white/10 text-white/70 bg-transparent hover:border-amber-400 hover:text-amber-300 transition-colors font-medium">Add widget</button>
              </div>
            </header>
            <main className="p-6 flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
