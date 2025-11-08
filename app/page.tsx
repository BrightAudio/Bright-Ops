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
    <main className="min-h-screen bg-rentman-light text-rentman-dark font-sans">
      {/* Nav */}
      <header className="w-full flex justify-between items-center px-12 py-6 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rentman-blue rounded-lg" />
          <h1 className="text-lg font-semibold tracking-tight text-rentman-dark">Bright Ops</h1>
        </div>
        <div className="flex gap-4">
          <button className="text-sm font-medium text-rentman-dark hover:text-rentman-blue">Login</button>
          <button className="bg-rentman-blue text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition">
            Create Home Base
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col lg:flex-row items-center justify-center px-10 lg:px-24 gap-12 mt-16">
        <div className="flex-1 max-w-xl">
          <h2 className="text-5xl font-bold text-rentman-dark leading-tight">
            Power Your <span className="text-rentman-blue">Home Base</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            Manage crew, equipment, and pull sheets in one connected workspace. Built for audio companies who want
            speed, control, and style.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button className="bg-rentman-blue text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-blue-700">
              Create Home Base
            </button>
            <button className="border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold text-sm hover:bg-slate-100">
              I already have an account
            </button>
          </div>
        </div>

        {/* Auth form card */}
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-xl p-8">
          <HomeAuth />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Bright Audio — All rights reserved
      </footer>
    </main>
  );
}
