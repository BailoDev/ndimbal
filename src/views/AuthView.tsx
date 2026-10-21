import { useState } from 'react';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';

interface Props {
  onDone: () => void;
  requiredRole?: 'officer' | 'admin';
}

export function AuthView({ onDone, requiredRole }: Props) {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = email.trim().includes('@') && password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) setError(result.error);
      else onDone();
    } catch {
      setError('Could not connect to Supabase. Check your project URL and anon key.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
        </div>
        {requiredRole ? (
          <>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {requiredRole === 'admin' ? t('auth.protectedAdmin') : t('auth.protected')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t('auth.signInPrompt')}</p>
          </>
        ) : (
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {t('auth.signIn')}
          </h1>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          <LogIn className="h-4 w-4 shrink-0 text-emerald-600" />
          {t('auth.signIn')}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t('auth.email')}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="input"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t('auth.password')}</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
              className="input"
              autoComplete="current-password"
              autoFocus
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!valid || busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? '…' : t('auth.signInBtn')}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-400">
          Reports can be submitted without an account. Staff accounts are created by an administrator.
        </p>
      </div>
    </div>
  );
}
