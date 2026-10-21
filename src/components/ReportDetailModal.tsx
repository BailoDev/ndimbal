import { X, MapPin, CalendarDays, User, FileText, Mic, Play, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Report, VoiceNote } from '@/lib/supabase';
import { supabase, CATEGORY_META } from '@/lib/supabase';
import { useAuth, isStaff } from '@/hooks/useAuth';
import { StatusBadge } from './StatusBadge';
import { StatusTracker } from './StatusTracker';
import { CategoryIcon } from './CategoryIcon';
import { UrgentBadge } from './UrgentBadge';

interface Props {
  report: Report | null;
  onClose: () => void;
}

export function ReportDetailModal({ report, onClose }: Props) {
  const { profile } = useAuth();
  const staff = isStaff(profile?.role);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  useEffect(() => {
    if (!report) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [report, onClose]);

  useEffect(() => {
    setVoiceUrl(null);
    if (!report || !report.has_voice_note || !staff) return;
    let cancelled = false;
    (async () => {
      setVoiceLoading(true);
      const { data: vnData } = await supabase
        .from('voice_notes')
        .select('id, report_id, storage_path, duration_seconds, created_at')
        .eq('report_id', report.id);
      if (cancelled) return;
      if (vnData && vnData.length > 0) {
        const vn = vnData[0] as VoiceNote;
        const { data: signed } = await supabase.storage
          .from('voice-notes')
          .createSignedUrl(vn.storage_path, 300);
        if (!cancelled && signed?.signedUrl) setVoiceUrl(signed.signedUrl);
      }
      if (!cancelled) setVoiceLoading(false);
    })();
    return () => { cancelled = true; };
  }, [report, staff]);

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CategoryIcon category={report.category} className="h-5 w-5" />
            </span>
            <div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
                {report.reference}
              </span>
              <p className="mt-1 text-xs text-slate-500">
                {CATEGORY_META[report.category].label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">{report.title}</h2>
        {report.is_urgent && (
          <div className="mt-2">
            <UrgentBadge size="md" />
          </div>
        )}
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{report.description}</p>

        {report.photo_url && (
          <img
            src={report.photo_url}
            alt={report.title}
            className="mt-4 w-full rounded-xl object-cover ring-1 ring-slate-200"
          />
        )}

        {/* Voice note playback — officers/admins only */}
        {report.has_voice_note && staff && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Mic className="h-3.5 w-3.5" />
              Voice Note
            </div>
            {voiceLoading ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : voiceUrl ? (
              <audio controls src={voiceUrl} className="w-full" />
            ) : (
              <p className="text-sm text-emerald-700/70">Voice note could not be loaded.</p>
            )}
          </div>
        )}

        {/* Voice note indicator for citizens — no playback */}
        {report.has_voice_note && !staff && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            <Play className="h-4 w-4 text-emerald-600" fill="currentColor" />
            A voice note was submitted with this report.
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status Progress
            </span>
            <StatusBadge status={report.status} />
          </div>
          <StatusTracker status={report.status} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <Detail icon={MapPin} label="Location" value={report.location} />
          <Detail
            icon={CalendarDays}
            label="Reported"
            value={new Date(report.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          />
          <Detail icon={User} label="Assigned to" value={report.assigned_to ?? 'Unassigned'} />
          <Detail
            icon={FileText}
            label="Last updated"
            value={new Date(report.updated_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          />
        </dl>

        {report.officer_notes && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Officer Notes
            </div>
            <p className="mt-1 text-sm text-amber-900">{report.officer_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}
