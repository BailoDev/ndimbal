import { useEffect, useState, useCallback } from 'react';
import { supabase, type Notification } from '@/lib/supabase';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setNotifications([]);
      setUnreadCount(0);
    } else {
      const rows = (data ?? []) as Notification[];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.is_read).length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    await load();
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    await load();
  }

  return { notifications, loading, unreadCount, reload: load, markAllRead, markRead };
}
