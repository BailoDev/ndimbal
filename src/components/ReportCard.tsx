import { MapPin, CalendarDays, Mic } from 'lucide-react';
import type { Report } from '@/lib/supabase';
import { CATEGORY_META } from '@/lib/supabase';
import { StatusBadge } from './StatusBadge';
import { CategoryIcon } from './CategoryIcon';
import { UrgentBadge } from './UrgentBadge';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

interface Props {
  report: Report;
  onClick?: (r: Report) => void;
  compact?: boolean;
}

export function ReportCard({ report, onClick, compact }: Props) {
  return (
    <button
      onClick={() => onClick?.(report)}
      className="group w-full rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition-all hover:ring-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600">
            <CategoryIcon category={report.category} />
          </span>
          <div>
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
              {report.reference}
            </span>
          </div>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold text-slate-900 sm:text-base">
          {report.title}
        </h3>
        {report.is_urgent && <UrgentBadge />}
      </div>

      {!compact && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{report.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {report.location}
        </span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {timeAgo(report.created_at)}
        </span>
        <span className="ml-auto rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {CATEGORY_META[report.category].label}
        </span>
        {report.has_voice_note && (
          <span className="flex items-center gap-0.5 text-emerald-600" title="Voice note attached">
            <Mic className="h-3 w-3" fill="currentColor" />
          </span>
        )}
      </div>
    </button>
  );
}
