import { Flame } from 'lucide-react';

interface Props {
  size?: 'sm' | 'md';
  className?: string;
}

export function UrgentBadge({ size = 'sm', className = '' }: Props) {
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-red-600 font-bold uppercase tracking-wide text-white ring-1 ring-red-700 ${pad} ${className}`}
    >
      <Flame className={iconSize} fill="currentColor" />
      Urgent
    </span>
  );
}
