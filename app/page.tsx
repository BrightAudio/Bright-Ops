import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import HomeAuth from "@/components/home/HomeAuth";

export default async function HomeBasePage() {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log('[HomePage] Session check:', session ? `User: ${session.user.email}` : 'No session');

  if (session) {
    redirect("/app/warehouse");
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white font-sans">
      {/* Nav */}
      <header className="w-full flex justify-between items-center px-12 py-6 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg" />
          <h1 className="text-lg font-semibold tracking-tight text-white">Bright Ops</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col lg:flex-row items-center justify-center px-10 lg:px-24 gap-12 mt-16">
        <div className="flex-1 max-w-xl">
          <h2 className="text-5xl font-bold text-white leading-tight">
            Power Your <span className="text-amber-500">Home Base</span>
          </h2>
          <p className="mt-4 text-gray-300 text-lg">
            Manage crew, equipment, and pull sheets in one connected workspace. Built for audio companies who want
            speed, control, and style.
          </p>
        </div>

        {/* Auth form card */}
        <div className="w-full max-w-md">
          <HomeAuth />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Bright Audio — All rights reserved
      </footer>
    </main>
  );
}
