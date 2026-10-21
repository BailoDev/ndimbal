import { useState, useMemo } from 'react';
import { Save, CheckCircle2, AlertCircle, UserPlus, Play, Loader2, Flame } from 'lucide-react';
import type { Report, ReportStatus, ReportCategory, VoiceNote } from '@/lib/supabase';
import {
  supabase,
  STATUS_ORDER,
  STATUS_META,
  CATEGORY_META,
  CATEGORIES,
} from '@/lib/supabase';
import { useReports } from '@/hooks/useReports';
import { useI18n } from '@/hooks/useI18n';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { UrgentBadge } from '@/components/UrgentBadge';

const STATUS_NEXT: Record<ReportStatus, ReportStatus | null> = {
  submitted: 'review',
  review: 'progress',
  progress: 'resolved',
  resolved: null,
  rejected: null,
};

interface Props {
  onSelect: (r: Report) => void;
}

export function OfficerView({ onSelect }: Props) {
  const { reports, loading, reload } = useReports();
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [editing, setEditing] = useState<Report | null>(null);
  const [newStatus, setNewStatus] = useState<ReportStatus>('submitted');
  const [assignTo, setAssignTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const filtered = useMemo(
    () => {
      const list = reports.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
        return true;
      });
      // Urgent reports float to the top, preserving the most-recent order within each group.
      return list.sort((a, b) => Number(b.is_urgent) - Number(a.is_urgent));
    },
    [reports, statusFilter, categoryFilter],
  );

  async function toggleUrgent(r: Report) {
    const { error } = await supabase.rpc('set_report_urgent', {
      p_report_id: r.id,
      p_is_urgent: !r.is_urgent,
    });
    if (!error) await reload();
  }

  async function openEditor(r: Report) {
    setEditing(r);
    setNewStatus(r.status);
    setAssignTo(r.assigned_to ?? '');
    setNotes(r.officer_notes ?? '');
    setSaveError(null);
    setSaved(false);
    setVoiceUrl(null);
    setVoiceNotes([]);

    // Fetch voice notes for this report (officer/admin only via RLS)
    if (r.has_voice_note) {
      setVoiceLoading(true);
      const { data: vnData } = await supabase
        .from('voice_notes')
        .select('id, report_id, storage_path, duration_seconds, created_at')
        .eq('report_id', r.id);
      if (vnData && vnData.length > 0) {
        const vn = vnData[0] as VoiceNote;
        setVoiceNotes(vnData as VoiceNote[]);
        const { data: signed } = await supabase.storage
          .from('voice-notes')
          .createSignedUrl(vn.storage_path, 300);
        if (signed?.signedUrl) setVoiceUrl(signed.signedUrl);
      }
      setVoiceLoading(false);
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.rpc('update_report', {
      p_report_id: editing.id,
      p_status: newStatus,
      p_assigned_to: assignTo.trim(),
      p_officer_notes: notes.trim(),
    });
    setSaving(false);
    if (error) {
      setSaveError('Could not save changes. You may not have permission.');
      return;
    }
    setSaved(true);
    await reload();
    setTimeout(() => {
      setEditing(null);
      setSaved(false);
    }, 1200);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('officer.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('officer.subtitle')}</p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label={t('track.allStatuses')} />
          {STATUS_ORDER.map((s) => (
            <Chip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={STATUS_META[s].label}
              dot={STATUS_META[s].dot}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip
            active={categoryFilter === 'all'}
            onClick={() => setCategoryFilter('all')}
            label={t('track.allCategories')}
          />
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
              label={CATEGORY_META[c].label}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">No reports in this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl bg-white p-3.5 ring-1 ring-slate-200 transition-all hover:ring-slate-300 sm:p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <CategoryIcon category={r.category} />
              </span>
              <button onClick={() => onSelect(r)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-medium text-slate-400">
                    {r.reference}
                  </span>
                  <StatusBadge status={r.status} />
                  {r.is_urgent && <UrgentBadge />}
                  {r.has_voice_note && (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                      <Play className="h-2.5 w-2.5" fill="currentColor" />
                      Voice
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {r.title}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {r.location} · {r.assigned_to ?? 'Unassigned'}
                </div>
              </button>
              <button
                onClick={() => toggleUrgent(r)}
                title={r.is_urgent ? 'Remove urgent flag' : 'Mark as urgent'}
                className={`shrink-0 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                  r.is_urgent
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${r.is_urgent ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => openEditor(r)}
                className="shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                {t('officer.manage')}
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {saved ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h3 className="mt-3 text-lg font-bold text-slate-900">{t('officer.saved')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('officer.savedMsg')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-medium text-slate-500">
                      {editing.reference}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{editing.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {editing.description}
                    </p>
                  </div>
                </div>

                {/* Voice note playback for officers */}
                {(editing.has_voice_note || voiceNotes.length > 0) && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      {t('officer.voiceNote')}
                    </div>
                    {voiceLoading ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    ) : voiceUrl ? (
                      <audio controls src={voiceUrl} className="w-full" />
                    ) : (
                      <p className="text-sm text-emerald-700/70">
                        Voice note could not be loaded. You may not have access.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {t('officer.status')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {STATUS_ORDER.map((s) => {
                        const active = newStatus === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setNewStatus(s)}
                            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                              active
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                              {STATUS_META[s].label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {STATUS_NEXT[editing.status] && newStatus === STATUS_NEXT[editing.status] && (
                      <p className="mt-2 text-xs text-emerald-600">
                        Advancing to next stage in the workflow.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {t('officer.assign')}
                    </label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={assignTo}
                        onChange={(e) => setAssignTo(e.target.value)}
                        placeholder="e.g. Officer Sambou"
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {t('officer.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add progress notes visible to other officers…"
                      className="input resize-none"
                    />
                  </div>

                  {saveError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditing(null)}
                      disabled={saving}
                      className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? t('officer.saving') : t('officer.save')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
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
