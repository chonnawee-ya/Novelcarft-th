import { useState } from 'react';
import { Check, Loader2, Palette, Sparkles, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { generateOpeningHookSamples } from '../services/geminiService';
import type { OpeningHookSamples } from '../types/novel';

interface StyleAnchorModalProps {
  open: boolean;
  onClose: () => void;
}

export function StyleAnchorModal({ open, onClose }: StyleAnchorModalProps) {
  const {
    activeProject,
    apiKey,
    aiSettings,
    isAIConfigured,
    setApiModalOpen,
    updateActiveProject,
    addToast,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<OpeningHookSamples['samples']>([]);

  if (!open || !activeProject) return null;

  const currentAnchor = activeProject.metadata.writingStyle?.styleAnchor ?? '';

  const handleGenerate = async () => {
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await generateOpeningHookSamples({
        apiKey,
        settings: aiSettings,
        project: activeProject,
      });
      setSamples(res.samples);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'สร้างตัวอย่างสำนวนไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePickStyle = async (styleName: string, excerpt: string) => {
    await updateActiveProject((p) => {
      p.metadata.writingStyle = {
        ...(p.metadata.writingStyle ?? {
          pov: 'บุรุษที่ 3 (ผู้เล่าเรื่อง)',
          proseStyle: styleName,
          chapterLength: 'medium',
          styleAnchor: '',
        }),
        proseStyle: styleName,
        styleAnchor: excerpt,
      };
      return p;
    });
    addToast({
      type: 'success',
      title: `ล็อกสไตล์ "${styleName}" เป็น Style Anchor แล้ว`,
      description: 'AI จะยึดสำนวนและจังหวะภาษานี้เวลาแต่งทุกตอนที่เหลือ',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">ลองชิม 3 สำนวนเปิดเรื่อง (Style Anchor)</h2>
              <p className="text-xs text-stone-500">เลือกสำนวนที่ถูกใจเพื่อใช้เป็นต้นแบบคุมโทนภาษาให้ AI ตลอดทั้งเรื่อง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[74vh] overflow-y-auto space-y-5">
          {currentAnchor && (
            <div className="rounded-xl bg-violet-50/70 border border-violet-200 p-3.5 text-xs">
              <p className="font-bold text-violet-900 mb-1">Style Anchor ที่กำลังใช้งานอยู่:</p>
              <p className="text-stone-700 line-clamp-3 leading-relaxed whitespace-pre-line">{currentAnchor}</p>
            </div>
          )}

          {samples.length === 0 && !loading && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                AI จะลองเขียน 2–3 ย่อหน้าเปิดเรื่องของ <strong>"{activeProject.metadata.title}"</strong> ใน 3 สไตล์ที่ต่างกัน
                (เว็บโนเวลอ่านไว / วรรณกรรมภาษาสวย / ดราม่า-ระทึกขวัญ) ให้คุณเลือกก่อนเริ่มแต่งจริง
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                สร้างตัวอย่าง 3 สไตล์เลย
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-stone-800">AI กำลังร่างตัวอย่างเปิดเรื่อง 3 สไตล์...</p>
            </div>
          )}

          {samples.length > 0 && !loading && (
            <div className="space-y-4">
              {samples.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-stone-200 hover:border-violet-300 p-5 space-y-3 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        สไตล์ที่ {idx + 1}: {s.styleName}
                      </h3>
                      <p className="text-xs text-stone-500">{s.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePickStyle(s.styleName, s.excerpt)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                      เลือกสำนวนนี้เป็น Style Anchor
                    </button>
                  </div>
                  <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 text-sm text-stone-800 leading-loose whitespace-pre-line font-[Sarabun]">
                    {s.excerpt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          {samples.length > 0 ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="text-xs font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50"
            >
              ลองสุ่ม 3 สไตล์ใหม่
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-200/70"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
