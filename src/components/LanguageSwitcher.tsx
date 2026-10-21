import { Globe } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { LANGS, type Lang } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <label className="relative inline-flex items-center">
      <Globe className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-slate-600 outline-none transition-colors hover:border-slate-300 focus:border-emerald-400"
        aria-label="Select language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-slate-400">▾</span>
    </label>
  );
}
