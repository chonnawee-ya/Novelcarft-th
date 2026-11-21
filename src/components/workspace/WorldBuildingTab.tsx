import { useState } from 'react';
import { Globe2, Pin, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateNewWorldItem } from '../../services/geminiService';
import { SteeringModal } from '../SteeringModal';

export function WorldBuildingTab() {
  const {
    activeProject,
    apiKey,
    aiSettings,
    isAIConfigured,
    setApiModalOpen,
    updateActiveProject,
    isGenerating,
    startGeneration,
    updateGenerationLabel,
    endGeneration,
    addToast,
  } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);

  if (!activeProject) return null;
  const items = activeProject.macroOutline.worldBuilding;
  const pinnedCount = items.filter((i) => i.isPinned).length;

  const handleAddManual = () => {
    updateActiveProject((p) => {
      p.macroOutline.worldBuilding.unshift({
        id: `wb-${Date.now()}`,
        category: 'กฎของโลก / สถานที่ใหม่',
        detail: '',
        isPinned: true,
      });
      return p;
    });
  };

  const handleGenerateAI = async (steeringPrompt: string) => {
    setModalOpen(false);
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }

    const controller = startGeneration('กำลังคิดข้อมูลโลก / Lore Bible เพิ่มเติม...');
    try {
      const next = await generateNewWorldItem({
        apiKey,
        settings: aiSettings,
        project: activeProject,
        steeringPrompt,
        signal: controller.signal,
        onRetry: (a, ms) =>
          updateGenerationLabel(`ลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วิ)...`),
      });
      await updateActiveProject((p) => {
        p.macroOutline.worldBuilding.push({
          id: `wb-${Date.now()}`,
          category: next.category,
          detail: next.detail,
          isPinned: true,
        });
        return p;
      });
      addToast({ type: 'success', title: `เพิ่มข้อมูลโลก "${next.category}" แล้ว` });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'สร้างข้อมูลโลกไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      endGeneration();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-stone-900">
              โลกและกฎเกณฑ์ (World-Building / Lore Bible)
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            การ์ดที่กดปักหมุด (📌 {pinnedCount} / {items.length}) จะถูกแนบเป็นกฎเหล็กให้ AI อ้างอิงเสมอเวลาสร้างตอนใหม่
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddManual}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          >
            <Plus className="w-4 h-4" />
            เพิ่มการ์ดเอง
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            ให้ AI คิดเพิ่ม
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 sm:p-5 transition-all ${
              item.isPinned
                ? 'bg-white border-amber-300 shadow-xs ring-1 ring-amber-200/60'
                : 'bg-white border-stone-200 opacity-90'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <input
                type="text"
                value={item.category}
                onChange={(e) =>
                  updateActiveProject(
                    (p) => {
                      p.macroOutline.worldBuilding[idx].category = e.target.value;
                      return p;
                    },
                    false
                  )
                }
                className="text-sm font-bold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-white rounded-lg px-2 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    updateActiveProject((p) => {
                      p.macroOutline.worldBuilding[idx].isPinned = !item.isPinned;
                      return p;
                    })
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    item.isPinned
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                  title={item.isPinned ? 'ปักหมุดไว้ในบริบท AI แล้ว' : 'คลิกเพื่อปักหมุด'}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {item.isPinned ? 'ปักหมุด' : 'ไม่ปักหมุด'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveProject((p) => {
                      p.macroOutline.worldBuilding.splice(idx, 1);
                      return p;
                    })
                  }
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                  title="ลบการ์ด"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={item.detail}
              onChange={(e) =>
                updateActiveProject(
                  (p) => {
                    p.macroOutline.worldBuilding[idx].detail = e.target.value;
                    return p;
                  },
                  false
                )
              }
              placeholder="รายละเอียดกฎของโลก ระบบพลัง สถานที่ หรือประวัติศาสตร์..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3.5 py-2.5 text-sm text-stone-700 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>

      <SteeringModal
        open={modalOpen}
        title="ให้ AI คิดข้อมูลโลก (Lore) เพิ่ม 1 รายการ"
        description="AI จะสร้างกฎของโลก องค์กร หรือสถานที่ใหม่ที่เข้ากับโครงเรื่องเดิมโดยไม่ขัดแย้งกับข้อมูลที่ปักหมุดไว้"
        placeholder="เช่น อยากได้ข้อมูลองค์กรลับที่ควบคุมตลาดมืด หรือข้อจำกัดของการใช้เวทมนตร์"
        confirmLabel="สร้าง Lore เพิ่ม"
        onClose={() => setModalOpen(false)}
        onConfirm={handleGenerateAI}
      />
    </div>
  );
}
