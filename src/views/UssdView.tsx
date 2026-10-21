import { useState } from 'react';
import { Phone, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import {
  supabase,
  CATEGORIES,
  CATEGORY_META,
  GAMBIAN_LOCATIONS,
  STATUS_META,
  type ReportCategory,
  type Report,
} from '@/lib/supabase';
import { useI18n } from '@/hooks/useI18n';

type Screen = 'menu' | 'category' | 'location' | 'description' | 'submit' | 'success' | 'check' | 'status';

interface Props {
  onDone: () => void;
  onTrack: (reference: string) => void;
}

export function UssdView({ onDone, onTrack }: Props) {
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>('menu');
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reportRef, setReportRef] = useState<string | null>(null);
  const [checkRef, setCheckRef] = useState('');
  const [foundReport, setFoundReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setScreen('menu');
    setCategory(null);
    setLocation('');
    setDescription('');
    setReportRef(null);
    setCheckRef('');
    setFoundReport(null);
    setError(null);
  }

  async function submitReport() {
    if (!category || !location.trim() || !description.trim()) return;
    setBusy(true);
    setError(null);
    const title = `${CATEGORY_META[category].label} issue in ${location.trim()}`;
    const { data, error } = await supabase
      .rpc('submit_report', {
        p_title: title,
        p_description: description.trim(),
        p_category: category,
        p_location: location.trim(),
        p_street_name: '',
        p_latitude: null,
        p_longitude: null,
        p_photo_url: '',
        p_is_urgent: false,
      })
      .single();
    setBusy(false);
    if (error || !data) {
      setError('Submission failed. Please try again.');
      setScreen('submit');
      return;
    }
    setReportRef((data as { reference: string }).reference);
    setScreen('success');
  }

  async function checkStatus() {
    if (!checkRef.trim()) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('public_reports')
      .select('*')
      .eq('reference', checkRef.trim())
      .maybeSingle();
    setBusy(false);
    if (error) {
      setError('Lookup failed. Please try again.');
      return;
    }
    setFoundReport(data as Report | null);
    setScreen('status');
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">USSD Demo — *123#</h1>
        <button onClick={onDone} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
          <Home className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Demo only.</strong> This is a simulated USSD menu. It is not connected to any real
          telecom network. Complaints are saved to the same database as the web app.
        </span>
      </div>

      {/* Basic-phone frame */}
      <div className="rounded-3xl bg-slate-900 p-3 shadow-xl ring-1 ring-slate-700">
        <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-medium text-slate-400">
          <span>NDIMBAL</span>
          <span>*123#</span>
        </div>

        <div className="min-h-[260px] rounded-2xl bg-slate-950 p-4 font-mono text-sm text-emerald-400">
          {screen === 'menu' && (
            <div className="space-y-2">
              <p className="text-emerald-300">Welcome to NDIMBAL — Fix Gambia</p>
              <p className="text-slate-400">Select an option:</p>
              <p>1. Report a problem</p>
              <p>2. Check report status</p>
              <p>0. Exit</p>
              <div className="mt-3 flex gap-2">
                <UssdButton onClick={() => { setScreen('category'); setError(null); }}>1</UssdButton>
                <UssdButton onClick={() => { setScreen('check'); setError(null); setCheckRef(''); setFoundReport(null); }}>2</UssdButton>
                <UssdButton onClick={onDone}>0</UssdButton>
              </div>
            </div>
          )}

          {screen === 'category' && (
            <div className="space-y-2">
              <p className="text-emerald-300">Select problem category:</p>
              {CATEGORIES.map((c, i) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setScreen('location'); }}
                  className="block w-full text-left text-emerald-400 hover:text-emerald-200"
                >
                  {i + 1}. {CATEGORY_META[c].label}
                </button>
              ))}
              <div className="mt-3">
                <UssdBack onClick={() => setScreen('menu')} />
              </div>
            </div>
          )}

          {screen === 'location' && (
            <div className="space-y-2">
              <p className="text-emerald-300">Category: {category && CATEGORY_META[category].label}</p>
              <p className="text-slate-400">Enter affected location:</p>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                list="ussd-locations"
                placeholder="e.g. Brikama"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-emerald-300 outline-none focus:border-emerald-500"
              />
              <datalist id="ussd-locations">
                {GAMBIAN_LOCATIONS.map((l) => <option key={l} value={l} />)}
              </datalist>
              <div className="mt-3 flex gap-2">
                <UssdButton onClick={() => location.trim() && setScreen('description')} disabled={!location.trim()}>
                  OK <ArrowRight className="h-3 w-3" />
                </UssdButton>
                <UssdBack onClick={() => setScreen('category')} />
              </div>
            </div>
          )}

          {screen === 'description' && (
            <div className="space-y-2">
              <p className="text-emerald-300">Location: {location}</p>
              <p className="text-slate-400">Enter short description:</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Describe the problem briefly…"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-emerald-300 outline-none focus:border-emerald-500"
              />
              <div className="mt-3 flex gap-2">
                <UssdButton onClick={() => { setScreen('submit'); }} disabled={!description.trim()}>
                  OK <ArrowRight className="h-3 w-3" />
                </UssdButton>
                <UssdBack onClick={() => setScreen('location')} />
              </div>
            </div>
          )}

          {screen === 'submit' && (
            <div className="space-y-3">
              <p className="text-emerald-300">Review your complaint:</p>
              <p>Category: {category && CATEGORY_META[category].label}</p>
              <p>Location: {location}</p>
              <p className="line-clamp-3">Desc: {description}</p>
              {error && <p className="text-red-400">{error}</p>}
              <div className="flex gap-2">
                <UssdButton onClick={submitReport} disabled={busy}>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Submit'}
                </UssdButton>
                <UssdBack onClick={() => setScreen('description')} />
              </div>
            </div>
          )}

          {screen === 'success' && reportRef && (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <p className="text-emerald-300">Complaint submitted!</p>
              <p className="text-slate-400">Your report ID:</p>
              <p className="text-lg font-bold text-emerald-300">{reportRef}</p>
              <p className="text-xs text-slate-500">Save this ID to track your report.</p>
              <div className="flex gap-2">
                <UssdButton onClick={() => onTrack(reportRef)}>Track now</UssdButton>
                <UssdButton onClick={reset}>New</UssdButton>
              </div>
            </div>
          )}

          {screen === 'check' && (
            <div className="space-y-2">
              <p className="text-emerald-300">Enter your report ID:</p>
              <p className="text-xs text-slate-500">e.g. JUN-2026-00011</p>
              <input
                value={checkRef}
                onChange={(e) => setCheckRef(e.target.value)}
                placeholder="JUN-2026-XXXXX"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-emerald-300 outline-none focus:border-emerald-500"
              />
              {error && <p className="text-red-400">{error}</p>}
              <div className="mt-3 flex gap-2">
                <UssdButton onClick={checkStatus} disabled={busy || !checkRef.trim()}>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Check'}
                </UssdButton>
                <UssdBack onClick={() => setScreen('menu')} />
              </div>
            </div>
          )}

          {screen === 'status' && (
            <div className="space-y-3">
              {foundReport ? (
                <>
                  <p className="text-emerald-300">Report status:</p>
                  <p className="text-lg font-bold text-emerald-300">{foundReport.reference}</p>
                  <p>{foundReport.title}</p>
                  <p>Location: {foundReport.location}</p>
                  <p>
                    Status:{' '}
                    <span className="font-semibold text-emerald-300">
                      {STATUS_META[foundReport.status].label}
                    </span>
                  </p>
                  {foundReport.assigned_to && <p>Officer: {foundReport.assigned_to}</p>}
                </>
              ) : (
                <p className="text-red-400">No report found with that ID.</p>
              )}
              <div className="flex gap-2">
                <UssdButton onClick={() => { setScreen('check'); setCheckRef(''); setFoundReport(null); }}>
                  Check another
                </UssdButton>
                <UssdButton onClick={reset}>Menu</UssdButton>
              </div>
            </div>
          )}
        </div>

        {/* Keypad hint */}
        <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500">
          <span><Phone className="inline h-3 w-3" /> *123#</span>
          <span className="text-slate-600">Demo</span>
        </div>
      </div>

      <button
        onClick={onDone}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {t('nav.dashboard')}
      </button>
    </div>
  );
}

function UssdButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-700"
    >
      {children}
    </button>
  );
}

function UssdBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600"
    >
      <ArrowLeft className="h-3 w-3" /> Back
    </button>
  );
}
