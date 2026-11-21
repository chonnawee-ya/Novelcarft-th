import { useState } from 'react';
import { Pin, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateNewCharacter } from '../../services/geminiService';
import { SteeringModal } from '../SteeringModal';

export function CharactersTab() {
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
  const characters = activeProject.macroOutline.characters;
  const pinnedCount = characters.filter((c) => c.isPinned).length;

  const handleAddManual = () => {
    updateActiveProject((p) => {
      p.macroOutline.characters.unshift({
        id: `char-${Date.now()}`,
        name: 'ตัวละครใหม่',
        role: 'ตัวรอง',
        archetype: '',
        goal: '',
        flaw: '',
        background: '',
        relationships: '',
        isPinned: true,
      });
      return p;
    });
  };

  const handleGenerateCharacter = async (steeringPrompt: string) => {
    setModalOpen(false);
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }

    const controller = startGeneration('กำลังออกแบบตัวละครใหม่ที่เข้ากับโครงเรื่อง...');
    try {
      const next = await generateNewCharacter({
        apiKey,
        settings: aiSettings,
        project: activeProject,
        steeringPrompt,
        signal: controller.signal,
        onRetry: (a, ms) =>
          updateGenerationLabel(`ลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วิ)...`),
      });
      await updateActiveProject((p) => {
        p.macroOutline.characters.push({
          id: `char-${Date.now()}`,
          ...next,
          isPinned: true,
        });
        return p;
      });
      addToast({ type: 'success', title: `เพิ่มตัวละคร "${next.name}" แล้ว` });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'สร้างตัวละครใหม่ไม่สำเร็จ',
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
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-stone-900">
              ตัวละครหลัก (Characters • {characters.length} ตัว)
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            ตัวละครที่ปักหมุด (📌 {pinnedCount} ตัว) จะถูกส่งให้ AI รักษาบุคลิก ปมในใจ และความสัมพันธ์ให้ตรงกันทุกตอน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddManual}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตัวละครเอง
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            ให้ AI เจนตัวละครเพิ่ม
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {characters.map((c, idx) => (
          <div
            key={c.id}
            className={`rounded-2xl border p-5 space-y-3.5 transition-all ${
              c.isPinned
                ? 'bg-white border-amber-300 shadow-xs ring-1 ring-amber-200/60'
                : 'bg-white border-stone-200'
            }`}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) =>
                    updateActiveProject(
                      (p) => {
                        p.macroOutline.characters[idx].name = e.target.value;
                        return p;
                      },
                      false
                    )
                  }
                  className="text-base font-bold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-white rounded-lg px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-2 px-1">
                  <input
                    type="text"
                    value={c.role}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.macroOutline.characters[idx].role = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    placeholder="บทบาท (เช่น ตัวเอก)"
                    className="text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg px-2.5 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={c.archetype}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.macroOutline.characters[idx].archetype = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    placeholder="Archetype"
                    className="text-xs text-stone-600 bg-stone-100 rounded-lg px-2.5 py-1 flex-1 min-w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    updateActiveProject((p) => {
                      p.macroOutline.characters[idx].isPinned = !c.isPinned;
                      return p;
                    })
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    c.isPinned
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {c.isPinned ? 'ปักหมุด' : 'ไม่ปักหมุด'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveProject((p) => {
                      p.macroOutline.characters.splice(idx, 1);
                      return p;
                    })
                  }
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                  title="ลบตัวละคร"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                  เป้าหมายหลัก (Goal)
                </label>
                <textarea
                  rows={2}
                  value={c.goal}
                  onChange={(e) =>
                    updateActiveProject(
                      (p) => {
                        p.macroOutline.characters[idx].goal = e.target.value;
                        return p;
                      },
                      false
                    )
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                  จุดอ่อน / ปมในใจ (Flaw)
                </label>
                <textarea
                  rows={2}
                  value={c.flaw}
                  onChange={(e) =>
                    updateActiveProject(
                      (p) => {
                        p.macroOutline.characters[idx].flaw = e.target.value;
                        return p;
                      },
                      false
                    )
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                ภูมิหลังย่อ (Background)
              </label>
              <textarea
                rows={2}
                value={c.background}
                onChange={(e) =>
                  updateActiveProject(
                    (p) => {
                      p.macroOutline.characters[idx].background = e.target.value;
                      return p;
                    },
                    false
                  )
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                ความสัมพันธ์กับตัวละครอื่น (Relationships)
              </label>
              <input
                type="text"
                value={c.relationships}
                onChange={(e) =>
                  updateActiveProject(
                    (p) => {
                      p.macroOutline.characters[idx].relationships = e.target.value;
                      return p;
                    },
                    false
                  )
                }
                placeholder="เช่น อดีตเพื่อนสนิทของตัวเอกที่ผันตัวไปอยู่ฝ่ายตรงข้าม"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>

      <SteeringModal
        open={modalOpen}
        title="ให้ AI ออกแบบตัวละครใหม่ 1 ตัว"
        description="AI จะสร้างตัวละครใหม่ที่ไม่ซ้ำเดิม พร้อมเป้าหมาย ปมในใจ และความสัมพันธ์ที่เชื่อมโยงกับตัวละครที่มีอยู่แล้ว"
        placeholder="เช่น อยากได้ตัวละครสายลับสองหน้าที่แฝงตัวเป็นเพื่อนร่วมงานของตัวเอก"
        confirmLabel="สร้างตัวละครใหม่"
        onClose={() => setModalOpen(false)}
        onConfirm={handleGenerateCharacter}
      />
    </div>
  );
}
