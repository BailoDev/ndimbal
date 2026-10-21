import { Flag, MapPin } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

export function Hero({ onReport }: { onReport: () => void }) {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute right-6 top-6 hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium sm:flex">
        <Flag className="h-3.5 w-3.5" />
        Republic of The Gambia
      </div>

      <div className="relative">
        <h2 className="max-w-lg text-2xl font-bold leading-tight sm:text-3xl">
          {t('hero.title')}
        </h2>
        <p className="mt-2 max-w-md text-sm text-emerald-50/90">
          {t('hero.subtitle')}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={onReport}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {t('hero.cta')}
          </button>
          <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-emerald-50">
            <MapPin className="h-4 w-4" />
            {t('hero.locations')}
          </div>
        </div>
      </div>
    </div>
  );
}
