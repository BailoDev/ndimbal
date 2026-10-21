import { Bell, CheckCircle2, Building2, RefreshCw, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { CATEGORY_META, type Notification as AppNotification, type ReportCategory } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Report } from '@/lib/supabase';

const TYPE_META: Record<AppNotification['type'], { icon: typeof Bell; color: string }> = {
  submission: { icon: FileText, color: 'bg-slate-100 text-slate-600' },
  assignment: { icon: Building2, color: 'bg-emerald-50 text-emerald-600' },
  status_change: { icon: RefreshCw, color: 'bg-blue-50 text-blue-600' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsView() {
  const { notifications, loading, unreadCount, markAllRead, markRead } = useNotifications();
  const [reportMap, setReportMap] = useState<Record<string, Report>>({});

  useEffect(() => {
    const ids = Array.from(new Set(notifications.map((n) => n.report_id).filter(Boolean) as string[]));
    if (ids.length === 0) {
      setReportMap({});
      return;
    }
    (async () => {
      const { data } = await supabase.from('public_reports').select('*').in('id', ids);
      if (data) {
        const map: Record<string, Report> = {};
        for (const r of data as Report[]) map[r.id] = r;
        setReportMap(map);
      }
    })();
  }, [notifications]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            In-app updates about your reports. {unreadCount > 0 && `${unreadCount} unread.`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-200">
        These are in-app notifications only. No SMS, email, or WhatsApp is sent.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
          <Bell className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            const report = n.report_id ? reportMap[n.report_id] : undefined;
            return (
              <button
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left ring-1 transition-all hover:ring-slate-300 ${
                  n.is_read ? 'ring-slate-200' : 'ring-emerald-200 bg-emerald-50/30'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                    {!n.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  {report && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono">{report.reference}</span>
                      <span>·</span>
                      <span>{CATEGORY_META[report.category as ReportCategory]?.label ?? report.category}</span>
                      <span>·</span>
                      <span>{report.location}</span>
                      {report.assigned_institution && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-emerald-600">{report.assigned_institution}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
