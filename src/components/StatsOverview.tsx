import { CheckCircle2, Clock, Loader2, Inbox, TrendingUp } from 'lucide-react';
import type { Report } from '@/lib/supabase';

interface Props {
  reports: Report[];
  loading: boolean;
}

export function StatsOverview({ reports, loading }: Props) {
  const total = reports.length;
  const pending = reports.filter((r) => r.status === 'submitted' || r.status === 'review').length;
  const inProgress = reports.filter((r) => r.status === 'progress').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const cards = [
    {
      label: 'Total Reports',
      value: total,
      icon: Inbox,
      tint: 'bg-slate-50 text-slate-700',
      ring: 'ring-slate-200',
    },
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      tint: 'bg-amber-50 text-amber-600',
      ring: 'ring-amber-200',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Loader2,
      tint: 'bg-blue-50 text-blue-600',
      ring: 'ring-blue-200',
    },
    {
      label: 'Resolved',
      value: resolved,
      icon: CheckCircle2,
      tint: 'bg-emerald-50 text-emerald-600',
      ring: 'ring-emerald-200',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`rounded-2xl bg-white p-4 ring-1 ${c.ring} sm:p-5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 sm:text-sm">
                  {c.label}
                </span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? '—' : c.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-50/50 p-4 ring-1 ring-emerald-100 sm:px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-emerald-900">Resolution Rate</div>
          <div className="text-xs text-emerald-700/80">
            {loading ? 'Calculating…' : `${resolutionRate}% of all reports resolved`}
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald-700">
          {loading ? '—' : `${resolutionRate}%`}
        </div>
      </div>
    </div>
  );
}
