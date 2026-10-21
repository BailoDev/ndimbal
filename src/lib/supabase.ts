import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ReportStatus = 'submitted' | 'review' | 'progress' | 'resolved' | 'rejected';

export type AssignmentStatus =
  | 'pending'
  | 'auto_assigned'
  | 'manually_assigned'
  | 'needs_manual_assignment';

export type ReportCategory =
  | 'roads'
  | 'water'
  | 'electricity'
  | 'waste'
  | 'healthcare'
  | 'education'
  | 'agriculture'
  | 'public_safety'
  | 'other';

export type UserRole = 'citizen' | 'officer' | 'admin';

export interface Report {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ReportCategory;
  location: string;
  street_name: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  photo_url: string | null;
  officer_notes: string | null;
  assigned_to: string | null;
  assigned_institution: string | null;
  assignment_status: AssignmentStatus;
  is_urgent: boolean;
  has_voice_note: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  report_id: string | null;
  user_id: string | null;
  type: 'submission' | 'assignment' | 'status_change';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface RoutingRule {
  id: string;
  category: ReportCategory | '*';
  location_pattern: string;
  institution: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export interface VoiceNote {
  id: string;
  report_id: string;
  storage_path: string;
  duration_seconds: number | null;
  created_at: string;
}

export const STATUS_META: Record<
  ReportStatus,
  { label: string; color: string; dot: string; step: number }
> = {
  submitted: {
    label: 'Submitted',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    step: 0,
  },
  review: {
    label: 'Assigned',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    step: 1,
  },
  progress: {
    label: 'In Progress',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    step: 2,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    step: 3,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    step: 3,
  },
};

export const CATEGORY_META: Record<ReportCategory, { label: string; icon: string }> = {
  roads: { label: 'Roads', icon: 'Route' },
  water: { label: 'Water', icon: 'Droplets' },
  electricity: { label: 'Electricity', icon: 'Zap' },
  waste: { label: 'Waste Management', icon: 'Trash2' },
  healthcare: { label: 'Healthcare', icon: 'HeartPulse' },
  education: { label: 'Education', icon: 'GraduationCap' },
  agriculture: { label: 'Agriculture', icon: 'Wheat' },
  public_safety: { label: 'Public Safety', icon: 'ShieldAlert' },
  other: { label: 'Other', icon: 'CircleDot' },
};

export const STATUS_ORDER: ReportStatus[] = ['submitted', 'review', 'progress', 'resolved'];
export const ALL_STATUSES: ReportStatus[] = ['submitted', 'review', 'progress', 'resolved', 'rejected'];

export const ASSIGNMENT_STATUS_META: Record<
  AssignmentStatus,
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  auto_assigned: { label: 'Auto-routed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  manually_assigned: { label: 'Manually assigned', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  needs_manual_assignment: { label: 'Needs manual assignment', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const CATEGORIES: ReportCategory[] = [
  'roads',
  'water',
  'electricity',
  'waste',
  'healthcare',
  'education',
  'agriculture',
  'public_safety',
  'other',
];

export const GAMBIAN_LOCATIONS = [
  'Banjul',
  'Kanifing',
  'Brikama',
  'Bakau',
  'Serekunda',
  'Bundung',
  'Tanji',
  'Lamin',
  'Farafenni',
  'Basse',
  'Janjanbureh',
  'Kuntaur',
];

export const INSTITUTIONS = [
  'KMC',
  'NAWEC',
  'GRA',
  'BANJUL CITY COUNCIL',
  'BRIKAMA AREA COUNCIL',
  'EFSTH',
  'MoBSE',
  'Department of Agriculture',
  'GPF',
  'NAMA',
  'NDMA',
  'GAMWORKS',
] as const;

// Client-side mirror of the seeded routing rules, used to preview the
// assigned institution on the form before submission. The server trigger is
// the source of truth; this is only a hint for the UI.
export function previewInstitution(category: ReportCategory, location: string): string | null {
  const loc = (location || '').trim().toLowerCase();
  const rules: { category: ReportCategory; pattern: string; institution: string; priority: number }[] = [
    { category: 'water', pattern: '*', institution: 'NAWEC', priority: 10 },
    { category: 'electricity', pattern: '*', institution: 'NAWEC', priority: 10 },
    { category: 'roads', pattern: 'kanifing', institution: 'KMC', priority: 20 },
    { category: 'roads', pattern: 'serekgunda', institution: 'KMC', priority: 20 },
    { category: 'roads', pattern: 'bakau', institution: 'KMC', priority: 20 },
    { category: 'roads', pattern: 'bundung', institution: 'KMC', priority: 20 },
    { category: 'roads', pattern: 'lamin', institution: 'KMC', priority: 20 },
    { category: 'roads', pattern: '*', institution: 'GRA', priority: 5 },
    { category: 'waste', pattern: 'kanifing', institution: 'KMC', priority: 20 },
    { category: 'waste', pattern: 'serekgunda', institution: 'KMC', priority: 20 },
    { category: 'waste', pattern: 'bakau', institution: 'KMC', priority: 20 },
    { category: 'waste', pattern: 'bundung', institution: 'KMC', priority: 20 },
    { category: 'waste', pattern: 'lamin', institution: 'KMC', priority: 20 },
    { category: 'waste', pattern: '*', institution: 'BANJUL CITY COUNCIL', priority: 5 },
    { category: 'healthcare', pattern: '*', institution: 'EFSTH', priority: 5 },
    { category: 'education', pattern: '*', institution: 'MoBSE', priority: 5 },
    { category: 'agriculture', pattern: '*', institution: 'Department of Agriculture', priority: 5 },
    { category: 'public_safety', pattern: '*', institution: 'GPF', priority: 5 },
  ];
  const matches = rules.filter(
    (r) => r.category === category && (r.pattern === '*' || loc.includes(r.pattern)),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.priority - a.priority);
  return matches[0].institution;
}
