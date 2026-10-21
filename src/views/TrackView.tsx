import { useState, useMemo, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import type { Report, ReportStatus, ReportCategory } from '@/lib/supabase';
import { CATEGORIES, CATEGORY_META, STATUS_ORDER, STATUS_META } from '@/lib/supabase';
import { useReports } from '@/hooks/useReports';
import { ReportCard } from '@/components/ReportCard';

interface Props {
  onSelect: (r: Report) => void;
  initialQuery?: string;
}

export function TrackView({ onSelect, initialQuery }: Props) {
  const { reports, loading } = useReports();
  const [query, setQuery] = useState(initialQuery ?? '');

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          r.title.toLowerCase().includes(q) ||
          r.reference.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [reports, query, statusFilter, categoryFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Track Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search by reference number, title, or location. Filter by status and category.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by reference, title, or location…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            label="All statuses"
          />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={STATUS_META[s].label}
              dot={STATUS_META[s].dot}
            />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <FilterChip
            active={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
            label="All categories"
          />
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
              label={CATEGORY_META[c].label}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${filtered.length} report${filtered.length === 1 ? '' : 's'}`}
        </span>
        {(statusFilter !== 'all' || categoryFilter !== 'all' || query) && (
          <button
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            <Filter className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">No reports match your search.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <ReportCard key={r.id} report={r} onClick={onSelect} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </button>
  );
}
