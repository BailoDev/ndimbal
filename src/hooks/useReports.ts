import { useEffect, useState, useCallback } from 'react';
import { supabase, type Report } from '@/lib/supabase';
import { useAuth, isStaff } from '@/hooks/useAuth';

export function useReports() {
  const { session, profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const staff = isStaff(profile?.role);
    const { data, error } = staff
      ? await supabase.from('reports').select('*').order('created_at', { ascending: false })
      : await supabase.from('public_reports').select('*').order('created_at', { ascending: false });

    if (error) {
      setError('Could not load reports. Please try again.');
      setReports([]);
      setLoading(false);
      return;
    }

    const baseReports = (data ?? []).map((report) => ({
      ...report,
      street_name: report.street_name ?? null,
      latitude: report.latitude ?? null,
      longitude: report.longitude ?? null,
      officer_notes: report.officer_notes ?? null,
      assigned_to: report.assigned_to ?? null,
      assignment_status: report.assignment_status ?? 'pending',
      has_voice_note: false,
    })) as Report[];

    // For officers/admins, fetch voice notes separately to set has_voice_note.
    // Citizens and anon users don't need this flag (they can't play voice notes).
    if (staff && baseReports.length > 0) {
      const reportIds = baseReports.map((r) => r.id);
      const { data: vnData, error: vnError } = await supabase
        .from('voice_notes')
        .select('report_id')
        .in('report_id', reportIds);

      if (vnError) {
        // Voice notes query failed — still show reports, just without the flag.
        setReports(baseReports.map((r) => ({ ...r, has_voice_note: false })));
      } else {
        const vnReportIds = new Set((vnData ?? []).map((v) => v.report_id));
        setReports(baseReports.map((r) => ({ ...r, has_voice_note: vnReportIds.has(r.id) })));
      }
    } else {
      setReports(baseReports.map((r) => ({ ...r, has_voice_note: false })));
    }

    setLoading(false);
  }, [profile?.role]);

  useEffect(() => {
    load();
  }, [load, session]);

  return { reports, loading, error, reload: load };
}
