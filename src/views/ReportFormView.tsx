import { useState, useRef } from 'react';
import { CheckCircle2, Send, AlertCircle, Mic, Search, Loader2, Flame, MapPin, Building2, Navigation } from 'lucide-react';
import {
  supabase,
  CATEGORIES,
  CATEGORY_META,
  GAMBIAN_LOCATIONS,
  previewInstitution,
  type ReportCategory,
} from '@/lib/supabase';
import { useI18n } from '@/hooks/useI18n';
import { CategoryIcon } from '@/components/CategoryIcon';
import { VoiceRecorder } from '@/components/VoiceRecorder';

interface Props {
  onTrack: (reference: string) => void;
}

export function ReportFormView({ onTrack }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('roads');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [successInst, setSuccessInst] = useState<string | null>(null);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [streetName, setStreetName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState(null as number | null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const voiceBlobRef = useRef<Blob | null>(null);
  const voiceDurationRef = useRef<number>(0);

  const hasValidText = title.trim().length >= 5 && description.trim().length >= 10;
  const valid = location.trim().length > 0 && (hasValidText || hasVoiceNote);
  const previewInst = previewInstitution(category, location);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not available on this device.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        setLocError('Could not get your location. You can still submit without it.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  const mapPreviewUrl =
    latitude !== null && longitude !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${(longitude - 0.005).toFixed(6)},${(
          latitude - 0.005
        ).toFixed(6)},${(longitude + 0.005).toFixed(6)},${(latitude + 0.005).toFixed(
          6,
        )}&layer=mapnik&marker=${latitude},${longitude}`
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .rpc('submit_report', {
          p_title: title.trim(),
          p_description: description.trim(),
          p_category: category,
          p_location: location.trim(),
          p_street_name: streetName,
          p_latitude: latitude,
          p_longitude: longitude,
          p_photo_url: photoUrl,
          p_is_urgent: isUrgent,
        })
        .single();

      if (insertError || !data) {
        throw insertError ?? new Error('Report submission returned no data');
      }

      const submittedReport = data as {
        id: string;
        reference: string;
        assigned_institution: string | null;
      };
      const reportId = submittedReport.id;
      setSuccessInst(submittedReport.assigned_institution);

      if (voiceBlobRef.current) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const blob = voiceBlobRef.current;
          const ext = blob.type.includes('webm') ? 'webm' : 'm4a';
          const path = `${uid}/${reportId}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('voice-notes')
            .upload(path, blob, { contentType: blob.type });

          if (uploadError) {
            console.error('Voice upload failed', uploadError);
          } else {
            const { error: voiceNoteError } = await supabase.from('voice_notes').insert({
              report_id: reportId,
              storage_path: path,
              duration_seconds: voiceDurationRef.current,
            });
            if (voiceNoteError) console.error('Voice note metadata insert failed', voiceNoteError);
          }
        } else {
          console.warn('Voice note skipped: sign in to attach voice notes.');
        }
      }

      setSuccessRef(submittedReport.reference);
      setSubmitting(false);
    } catch (cause) {
      const backendError = cause as { code?: string; message?: string };
      const errorMessage = backendError.message ?? 'Unknown Supabase error';
      console.error('Report insert failed', {
        code: backendError.code,
        message: errorMessage,
      });
      setSubmitting(false);
      setError(
        backendError.code === 'PGRST202' ||
          backendError.code === 'PGRST205' ||
          backendError.code === '42P01' ||
          /schema cache|not found|404/i.test(errorMessage)
          ? 'The Supabase schema is not installed yet. Follow supabase/SETUP.md, then try again.'
          : 'Could not submit your report. Please try again.',
      );
    }
  }

  if (successRef) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-emerald-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">{t('report.success')}</h2>
          <p className="mt-2 text-sm text-slate-600">{t('report.successMsg')}</p>
          <div className="mt-5 rounded-xl bg-slate-900 py-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">{t('report.yourRef')}</div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-400">{successRef}</div>
          </div>
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-500">
                <CategoryIcon category={category} className="h-4 w-4" />
                Category
              </span>
              <span className="font-semibold text-slate-800">{CATEGORY_META[category].label}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="h-4 w-4" />
                Location
              </span>
              <span className="font-semibold text-slate-800">{location}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Building2 className="h-4 w-4" />
                Routed to
              </span>
              <span className="font-semibold text-slate-800">
                {successInst ?? (
                  <span className="text-amber-600">Manual review needed</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Status</span>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                Submitted
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            A confirmation has been added to your notifications.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setSuccessRef(null);
                setTitle('');
                setDescription('');
                setCategory('roads');
                setLocation('');
                setPhotoUrl('');
                setIsUrgent(false);
                setStreetName('');
                setLatitude(null);
                setLongitude(null);
                setSuccessInst(null);
                voiceBlobRef.current = null;
                voiceDurationRef.current = 0;
                setHasVoiceNote(false);
              }}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              {t('report.another')}
            </button>
            <button
              onClick={() => successRef && onTrack(successRef)}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Search className="h-4 w-4" />
                Track this report
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('report.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('report.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <Field label={t('report.fieldTitle')} hint={t('report.fieldTitleHint')} optional>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pothole near the market entrance"
            className="input"
            maxLength={120}
          />
        </Field>

        <Field label={t('report.fieldDesc')} hint={t('report.fieldDescHint')} optional>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem, how long it's been happening, and who it affects."
            rows={4}
            className="input resize-none"
            maxLength={1000}
          />
        </Field>

        {/* Voice note recorder — prominent, above the category selector */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Mic className="h-4 w-4 text-emerald-600" />
            {t('report.voice.title')}
          </div>
          <VoiceRecorder
            onRecorded={(blob, secs) => {
              voiceBlobRef.current = blob;
              voiceDurationRef.current = secs;
              setHasVoiceNote(true);
            }}
            onCleared={() => {
              voiceBlobRef.current = null;
              voiceDurationRef.current = 0;
              setHasVoiceNote(false);
            }}
          />
        </div>

        <Field label={t('report.fieldCategory')} required>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CategoryIcon category={c} className="h-5 w-5" />
                  {CATEGORY_META[c].label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t('report.fieldLocation')} required>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            list="gambia-locations"
            placeholder="Community, town, or village — e.g. Brikama, Kanifing…"
            className="input"
          />
          <datalist id="gambia-locations">
            {GAMBIAN_LOCATIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>

        <Field label="Street / landmark (optional)" hint="A street name, landmark, or description">
          <input
            value={streetName}
            onChange={(e) => setStreetName(e.target.value)}
            placeholder="e.g. near Albert Market, or Serrekunda Highway"
            className="input"
            maxLength={120}
          />
        </Field>

        <Field label="Map pin (optional)" hint="Helps staff locate the issue. Never shown publicly.">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                Use my location
              </button>
              {latitude !== null && longitude !== null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
              )}
              {latitude !== null && longitude !== null && (
                <button
                  type="button"
                  onClick={() => { setLatitude(null); setLongitude(null); }}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
            {locError && <p className="text-xs text-slate-500">{locError}</p>}
            {mapPreviewUrl && (
              <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                <iframe
                  title="Location preview"
                  src={mapPreviewUrl}
                  className="h-40 w-full border-0"
                  loading="lazy"
                />
              </div>
            )}
            <p className="text-xs text-slate-400">
              Location is optional. You can submit without sharing your exact position.
            </p>
          </div>
        </Field>

        {previewInst && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
            <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              This report will be routed to <strong>{previewInst}</strong> based on the category and location.
            </span>
          </div>
        )}
        {!previewInst && location.trim() && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              No automatic routing rule matches this category/location. Staff will assign it manually.
            </span>
          </div>
        )}

        <Field label={t('report.fieldPhoto')}>
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
            className="input"
            type="url"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50">
          <button
            type="button"
            role="switch"
            aria-checked={isUrgent}
            onClick={() => setIsUrgent((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              isUrgent ? 'bg-red-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isUrgent ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Flame className="h-4 w-4 text-red-600" />
            Mark as urgent
          </span>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('report.submitting')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('report.submit')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {optional && <span className="ml-1.5 text-xs font-normal text-slate-400">(optional)</span>}
        </span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
