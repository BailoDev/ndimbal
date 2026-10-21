import { useMemo, useState, useEffect, useCallback } from 'react';
import { Layers, ArrowUp, ArrowDown, Users, UserCog, ShieldCheck, AlertCircle, Search, Flame } from 'lucide-react';
import type { Report, ReportCategory, Profile, ReportStatus } from '@/lib/supabase';
import {
  supabase,
  CATEGORIES,
  CATEGORY_META,
  ALL_STATUSES,
  STATUS_ORDER,
  STATUS_META,
} from '@/lib/supabase';
import { useReports } from '@/hooks/useReports';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { UrgentBadge } from '@/components/UrgentBadge';

interface Props {
  onSelect: (r: Report) => void;
}

type SortKey = 'newest' | 'oldest' | 'title';

export function AdminView({ onSelect }: Props) {
  const { reports, loading, reload } = useReports();
  const { t } = useI18n();
  const { profile } = useAuth();
  const [sort, setSort] = useState<SortKey>('newest');
  const [catFilter, setCatFilter] = useState<ReportCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [urgentBusy, setUrgentBusy] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // User management state
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    const { data, error } = await supabase.rpc('list_all_profiles');
    if (error) {
      setRoleError('Could not load users.');
      setAllProfiles([]);
    } else {
      setAllProfiles((data ?? []) as Profile[]);
      setRoleError(null);
    }
    setProfilesLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function changeRole(userId: string, newRole: 'citizen' | 'officer' | 'admin') {
    setRoleBusy(userId);
    setRoleError(null);
    const { error } = await supabase.rpc('set_user_role', {
      p_user_id: userId,
      p_role: newRole,
    });
    setRoleBusy(null);
    if (error) {
      setRoleError('Could not update role. You may not have permission.');
    } else {
      await loadProfiles();
    }
  }

  const sorted = useMemo(() => {
    let list = reports.slice();
    if (catFilter !== 'all') list = list.filter((r) => r.category === catFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.reference.toLowerCase() === q);
    }
    if (sort === 'newest') list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === 'oldest') list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    // Urgent reports always float to the top regardless of sort order.
    list.sort((a, b) => Number(b.is_urgent) - Number(a.is_urgent));
    return list;
  }, [reports, sort, catFilter, search]);

  async function toggleUrgent(r: Report) {
    if (!profile || profile.role !== 'admin') return;
    setUrgentBusy(r.id);
    const { error } = await supabase.rpc('set_report_urgent', {
      p_report_id: r.id,
      p_is_urgent: !r.is_urgent,
    });
    setUrgentBusy(null);
    if (!error) await reload();
  }

  async function changeStatus(r: Report, status: ReportStatus) {
    if (status === r.status) return;
    setStatusBusy(r.id);
    setStatusError(null);
    const { error } = await supabase.rpc('update_report', {
      p_report_id: r.id,
      p_status: status,
      p_assigned_to: r.assigned_to ?? '',
      p_officer_notes: r.officer_notes ?? '',
    });
    setStatusBusy(null);
    if (error) {
      setStatusError(`Could not update ${r.reference}. Please try again.`);
      return;
    }
    await reload();
  }

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of CATEGORIES) map[c] = 0;
    for (const r of reports) map[r.category] = (map[r.category] ?? 0) + 1;
    return map;
  }, [reports]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATUS_ORDER) map[s] = 0;
    for (const r of reports) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [reports]);

  const officers = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reports) {
      if (r.assigned_to) map[r.assigned_to] = (map[r.assigned_to] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reports]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of all reports, category distribution, and officer assignments.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-700">By Category</h2>
          </div>
          <div className="space-y-2">
            {CATEGORIES.map((c) => {
              const count = byCategory[c] ?? 0;
              const pct = reports.length > 0 ? (count / reports.length) * 100 : 0;
              return (
                <div key={c}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <CategoryIcon category={c} className="h-3.5 w-3.5" />
                      {CATEGORY_META[c].label}
                    </span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-700">Officer Assignments</h2>
            </div>
            {officers.length === 0 ? (
              <p className="text-sm text-slate-400">No officers assigned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {officers.map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {count} report{count === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Status Breakdown</h2>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="rounded-lg bg-slate-50 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                    <span className="text-xs text-slate-500">{STATUS_META[s].label}</span>
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-slate-900">{byStatus[s] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User management — admin only */}
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-700">{t('admin.manageUsers')}</h2>
        </div>
        {roleError && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{roleError}</span>
          </div>
        )}
        {profilesLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : allProfiles.length === 0 ? (
          <p className="text-sm text-slate-400">No registered users yet.</p>
        ) : (
          <div className="space-y-1.5">
            {allProfiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                  {p.role === 'admin' ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {p.full_name ?? 'Unnamed user'}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {p.id.slice(0, 8)}…
                  </div>
                </div>
                <select
                  value={p.role}
                  onChange={(e) => changeRole(p.id, e.target.value as 'citizen' | 'officer' | 'admin')}
                  disabled={roleBusy === p.id}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-50"
                >
                  <option value="citizen">Citizen</option>
                  <option value="officer">Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          {t('auth.demoNote')}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">{t('admin.allReports')}</h2>
          <div className="flex flex-1 items-center gap-2 sm:flex-none">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by report ID e.g. JUN-2026-00011"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as ReportCategory | 'all')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              <button
                onClick={() => setSort('newest')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${
                  sort === 'newest' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDown className="h-3 w-3" /> New
              </button>
              <button
                onClick={() => setSort('oldest')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${
                  sort === 'oldest' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUp className="h-3 w-3" /> Old
              </button>
              <button
                onClick={() => setSort('title')}
                className={`px-2.5 py-1.5 text-xs font-medium ${
                  sort === 'title' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {statusError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {statusError}
              </div>
            )}
            {sorted.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No report matches that report ID.
              </p>
            )}
            {sorted.map((r) => (
              <div
                key={r.id}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <CategoryIcon category={r.category} className="h-4 w-4" />
                </span>
                <button onClick={() => onSelect(r)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">{r.title}</span>
                    {r.is_urgent && <UrgentBadge />}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.reference} · {r.location} · {r.assigned_to ?? 'Unassigned'}
                  </div>
                </button>
                <button
                  onClick={() => toggleUrgent(r)}
                  disabled={urgentBusy === r.id}
                  title={r.is_urgent ? 'Remove urgent flag' : 'Mark as urgent'}
                  className={`shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    r.is_urgent
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Flame className={`h-3.5 w-3.5 ${r.is_urgent ? 'fill-current' : ''}`} />
                </button>
                <button onClick={() => onSelect(r)} className="shrink-0">
                  <StatusBadge status={r.status} />
                </button>
                <select
                  aria-label={`Update status for ${r.reference}`}
                  value={r.status}
                  onChange={(e) => changeStatus(r, e.target.value as ReportStatus)}
                  disabled={statusBusy === r.id}
                  className="max-w-28 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-50"
                >
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status === 'review' ? 'Approve · Assigned' : STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
