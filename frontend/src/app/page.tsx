import { FixtureCard } from '../components/FixtureCard';
import { Trophy, ShieldAlert } from 'lucide-react';

async function getLiveSchedule() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  try {
    const res = await fetch(`${apiUrl}/fixtures`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.fixtures || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const fixtures = await getLiveSchedule();

  return (
    <div className="space-y-6">
      {/* Age & Regulatory Notice Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Regulated by BCLB Kenya. Strictly 18+. Responsible Wagering applies. 5% Withholding Tax applied at settlement.</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-black uppercase text-white tracking-wide">Live & Upcoming Fixtures</h1>
        </div>
      </div>

      {fixtures.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-8 text-center text-slate-500">
          No matches currently scheduled. Start the backend worker or configure local fixtures via the referee panel.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fixtures.map((f: any) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </div>
      )}
    </div>
  );
}