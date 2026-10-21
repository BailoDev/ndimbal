import { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface Props {
  onRecorded: (blob: Blob, durationSeconds: number) => void;
  onCleared: () => void;
}

type RecorderState = 'idle' | 'recording' | 'recorded' | 'playing';

export function VoiceRecorder({ onRecorded, onCleared }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (streamRef.current) streamRef.current.getTracks().forEach((tr) => tr.stop());
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [clearTimer]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const secs = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = URL.createObjectURL(blob);
        audioElRef.current = new Audio(audioUrlRef.current);
        setElapsed(0);
        setDuration(secs);
        setState('recorded');
        onRecorded(blob, secs);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((tr) => tr.stop());
          streamRef.current = null;
        }
      };
      mr.start();
      startRef.current = Date.now();
      setDuration(0);
      clearTimer();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startRef.current) / 1000));
      }, 200);
      setState('recording');
    } catch {
      setError(t('report.voice.notSupported'));
      setState('idle');
    }
  }

  function stopRecording() {
    clearTimer();
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  }

  function playRecording() {
    const el = audioElRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play();
    setState('playing');
    el.onended = () => {
      setState('recorded');
      setElapsed(0);
    };
    el.ontimeupdate = () => setElapsed(Math.floor(el.currentTime));
  }

  function pausePlayback() {
    audioElRef.current?.pause();
    setState('recorded');
  }

  function deleteRecording() {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    chunksRef.current = [];
    setDuration(0);
    setElapsed(0);
    setState('idle');
    onCleared();
  }

  if (!supported) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 ring-1 ring-slate-200">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {t('report.voice.notSupported')}
      </div>
    );
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-emerald-800">{t('report.voice.title')}</div>
          <div className="text-xs text-emerald-700/70">{t('report.voice.subtitle')}</div>
        </div>
        {state === 'recorded' && (
          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {fmtTime(duration)}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        {state === 'idle' && (
          <button
            onClick={startRecording}
            className="group flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 sm:h-32 sm:w-32"
            aria-label={t('report.voice.record')}
          >
            <Mic className="h-10 w-10 transition-transform group-hover:scale-110" />
            <span className="text-xs font-semibold">{t('report.voice.record')}</span>
          </button>
        )}

        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="group flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 sm:h-32 sm:w-32"
            aria-label={t('report.voice.stop')}
          >
            <span className="absolute flex h-28 w-28 animate-ping rounded-full bg-red-400 opacity-30 sm:h-32 sm:w-32" />
            <Square className="h-9 w-9" fill="currentColor" />
            <span className="text-xs font-semibold">{t('report.voice.recording')}</span>
            <span className="text-lg font-bold tabular-nums">{fmtTime(duration)}</span>
          </button>
        )}

        {state === 'recorded' && (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={playRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-all hover:scale-105 active:scale-95"
                aria-label={t('report.voice.play')}
              >
                <Play className="h-7 w-7" fill="currentColor" />
              </button>
              <button
                onClick={deleteRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-all hover:scale-105 hover:bg-red-100 hover:text-red-600 active:scale-95"
                aria-label={t('report.voice.delete')}
              >
                <Trash2 className="h-6 w-6" />
              </button>
            </div>
            <div className="text-sm text-slate-500">{fmtTime(duration)}</div>
          </div>
        )}

        {state === 'playing' && (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={pausePlayback}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-all hover:scale-105 active:scale-95"
                aria-label="Pause"
              >
                <Pause className="h-7 w-7" fill="currentColor" />
              </button>
              <button
                onClick={deleteRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-all hover:scale-105 hover:bg-red-100 hover:text-red-600 active:scale-95"
                aria-label={t('report.voice.delete')}
              >
                <Trash2 className="h-6 w-6" />
              </button>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${duration > 0 ? (elapsed / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-1 text-center text-xs tabular-nums text-slate-500">
                {fmtTime(elapsed)} / {fmtTime(duration)}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
