import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((t) => {
        const styles = {
          success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          error: 'bg-rose-50 border-rose-200 text-rose-900',
          warning: 'bg-amber-50 border-amber-200 text-amber-900',
          info: 'bg-white border-stone-200 text-stone-800',
        }[t.type];

        const Icon = {
          success: CheckCircle2,
          error: AlertCircle,
          warning: TriangleAlert,
          info: Info,
        }[t.type];

        const iconColor = {
          success: 'text-emerald-600',
          error: 'text-rose-600',
          warning: 'text-amber-600',
          info: 'text-indigo-600',
        }[t.type];

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all ${styles}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-xs opacity-85 mt-0.5 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-0.5 rounded-md opacity-60 hover:opacity-100 transition-opacity"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
