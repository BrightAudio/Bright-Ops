const buildTimestamp = new Date().toLocaleString();

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900 text-white p-6 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Bright Audio is live.</h1>
      <p className="mb-6 text-zinc-400">Build: {buildTimestamp}</p>
      <div className="flex gap-4">
        <a href="/debug" className="px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors">Debug</a>
        <a href="/jobs/new" className="px-4 py-2 bg-zinc-800 text-amber-400 rounded font-semibold border border-amber-400 hover:bg-zinc-700 transition-colors">New Job</a>
      </div>
    </main>
  );
}
