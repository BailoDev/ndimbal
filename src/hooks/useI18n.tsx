import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translate, type Lang } from '@/lib/i18n';

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('ndimbal-lang');
    if (saved === 'en' || saved === 'wolof' || saved === 'mandinka' || saved === 'fula') return saved;
    return 'en';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('ndimbal-lang', l);
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
