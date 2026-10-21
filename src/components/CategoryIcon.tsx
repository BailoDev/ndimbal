import {
  Route,
  Droplets,
  Zap,
  Trash2,
  HeartPulse,
  GraduationCap,
  Wheat,
  ShieldAlert,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORY_META, type ReportCategory } from '@/lib/supabase';

const ICONS: Record<string, LucideIcon> = {
  Route,
  Droplets,
  Zap,
  Trash2,
  HeartPulse,
  GraduationCap,
  Wheat,
  ShieldAlert,
  CircleDot,
};

export function CategoryIcon({
  category,
  className = 'h-4 w-4',
}: {
  category: ReportCategory;
  className?: string;
}) {
  const Icon = ICONS[CATEGORY_META[category].icon];
  return <Icon className={className} />;
}
