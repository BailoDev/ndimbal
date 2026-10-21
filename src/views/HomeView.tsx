import { ArrowRight } from 'lucide-react';
import type { Report } from '@/lib/supabase';
import { useReports } from '@/hooks/useReports';
import { Hero } from '@/components/Hero';
import { StatsOverview } from '@/components/StatsOverview';
import { ReportCard } from '@/components/ReportCard';
import type { View } from '@/components/Nav';

interface Props {
  setView: (v: View) => void;
  onSelect: (r: Report) => void;
}

export function HomeView({ setView, onSelect }: Props) {
  const { reports, loading } = useReports();
  const recent = reports.slice(0, 6);

  return (
    <div className="space-y-6">
      <Hero onReport={() => setView('report')} />
      <StatsOverview reports={reports} loading={loading} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Reports</h2>
          <button
            onClick={() => setView('track')}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">No reports yet. Be the first to report a problem.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((r) => (
              <ReportCard key={r.id} report={r} onClick={onSelect} compact />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
