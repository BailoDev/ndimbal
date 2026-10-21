import { STATUS_META, STATUS_ORDER, type ReportStatus } from '@/lib/supabase';

export function StatusTracker({ status }: { status: ReportStatus }) {
  const currentStep = STATUS_META[status].step;
  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((s, i) => {
        const done = i <= currentStep;
        const isLast = i === STATUS_ORDER.length - 1;
        return (
          <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              {i + 1}
            </div>
            {!isLast && (
              <div
                className={`h-0.5 w-full rounded-full transition-colors ${
                  i < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
