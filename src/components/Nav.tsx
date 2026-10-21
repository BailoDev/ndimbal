import {
  Home,
  FilePlus,
  Search,
  ShieldCheck,
  Settings,
  LogIn,
  LogOut,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { useAuth, isStaff } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSwitcher } from './LanguageSwitcher';

export type View = 'home' | 'report' | 'track' | 'ussd' | 'officer' | 'admin' | 'auth';

interface NavItem {
  id: View;
  labelKey: string;
  icon: LucideIcon;
  requiresStaff?: boolean;
  requiresAdmin?: boolean;
}

const NAV: NavItem[] = [
  { id: 'home', labelKey: 'nav.dashboard', icon: Home },
  { id: 'report', labelKey: 'nav.report', icon: FilePlus },
  { id: 'track', labelKey: 'nav.track', icon: Search },
  { id: 'ussd', labelKey: 'nav.ussd', icon: Phone },
  { id: 'officer', labelKey: 'nav.officer', icon: ShieldCheck, requiresStaff: true },
  { id: 'admin', labelKey: 'nav.admin', icon: Settings, requiresAdmin: true },
];

interface Props {
  view: View;
  setView: (v: View) => void;
}

export function Nav({ view, setView }: Props) {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const staff = isStaff(profile?.role);
  const isAdmin = profile?.role === 'admin';

  const visibleNav = NAV.filter((item) => {
    if (item.requiresAdmin) return isAdmin;
    if (item.requiresStaff) return staff;
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm">
              <span className="text-base font-bold text-white">N</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">{t('app.name')}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                {t('app.tagline')}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <nav className="hidden gap-1 md:flex">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.labelKey)}
                  </button>
                );
              })}
            </nav>

            <LanguageSwitcher />

            {profile ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {profile.full_name ?? profile.role}
                  {staff && (
                    <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                      {profile.role}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('auth')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <LogIn className="h-3.5 w-3.5" />
                {t('nav.login')}
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-6xl items-stretch justify-around px-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
