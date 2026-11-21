import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface SteeringModalProps {
  open: boolean;
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (steeringPrompt: string) => void;
}

export function SteeringModal({
  open,
  title,
  description,
  placeholder = 'เช่น อยากให้ตัวร้ายโผล่มาหักหลังท้ายตอน หรือเพิ่มบรรยากาศกดดันขึ้น (เว้นว่างได้หากให้ AI คิดใหม่เอง)',
  confirmLabel = 'สั่ง AI สร้างใหม่',
  onClose,
  onConfirm,
}: SteeringModalProps) {
  const [prompt, setPrompt] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(prompt.trim());
    setPrompt('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-stone-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">{description}</p>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              คำสั่งเพิ่มเติมสำหรับ AI (Steering Prompt — ไม่บังคับ)
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
