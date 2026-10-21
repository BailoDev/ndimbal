import { useState } from 'react';
import type { Report } from '@/lib/supabase';
import { Nav, type View } from '@/components/Nav';
import { HomeView } from '@/views/HomeView';
import { ReportFormView } from '@/views/ReportFormView';
import { TrackView } from '@/views/TrackView';
import { UssdView } from '@/views/UssdView';
import { OfficerView } from '@/views/OfficerView';
import { AdminView } from '@/views/AdminView';
import { AuthView } from '@/views/AuthView';
import { ReportDetailModal } from '@/components/ReportDetailModal';
import { useAuth, isStaff } from '@/hooks/useAuth';

function App() {
  const [view, setView] = useState<View>('home');
  const [selected, setSelected] = useState<Report | null>(null);
  const [trackQuery, setTrackQuery] = useState('');
  const { profile, loading } = useAuth();

  const staff = isStaff(profile?.role);
  const isAdmin = profile?.role === 'admin';

  function navigate(v: View) {
    // Enforce role-based access at the routing level (defense-in-depth;
    // the database also enforces this via RLS + SECURITY DEFINER functions).
    if (v === 'officer' && !staff) {
      setView('auth');
      return;
    }
    if (v === 'admin' && !isAdmin) {
      setView('auth');
      return;
    }
    setView(v);
  }

  // Determine which view to actually render, considering auth state
  let activeView = view;
  let authRequiredRole: 'officer' | 'admin' | undefined;

  if ((view === 'officer' || view === 'admin') && !loading) {
    if (view === 'officer' && !staff) {
      activeView = 'auth';
      authRequiredRole = 'officer';
    } else if (view === 'admin' && !isAdmin) {
      activeView = 'auth';
      authRequiredRole = 'admin';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav view={view} setView={navigate} />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">
        {activeView === 'home' && <HomeView setView={navigate} onSelect={setSelected} />}
        {activeView === 'report' && (
          <ReportFormView
            onTrack={(ref) => {
              setTrackQuery(ref);
              navigate('track');
            }}
          />
        )}
        {activeView === 'track' && <TrackView onSelect={setSelected} initialQuery={trackQuery} />}
        {activeView === 'ussd' && (
          <UssdView
            onDone={() => navigate('home')}
            onTrack={(ref) => {
              setTrackQuery(ref);
              navigate('track');
            }}
          />
        )}
        {activeView === 'officer' && staff && <OfficerView onSelect={setSelected} />}
        {activeView === 'admin' && isAdmin && <AdminView onSelect={setSelected} />}
        {activeView === 'auth' && (
          <AuthView
            requiredRole={authRequiredRole}
            onDone={() => {
              // After auth, try to go to the originally requested view
              if (view === 'officer' || view === 'admin') {
                // Re-check: if they now have the role, navigate there
                // Otherwise they'll stay on auth screen after re-render
                setView(view);
              } else {
                navigate('home');
              }
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center">
          <p className="text-xs text-slate-500">
            NDIMBAL — Fix Gambia 🇬🇲 · A citizen platform for transparent community problem reporting.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Frontend prototype · Data stored in Supabase (Postgres). Java/Spring Boot backend is a separate deliverable.
          </p>
        </div>
      </footer>

      <ReportDetailModal report={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default App;
