import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookText,
  Minimize2,
  Plus,
  RefreshCw,
  ScrollText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { compressRollingSummary, regenerateLogline, regenerateSingleBeat } from '../../services/geminiService';
import { estimateTokens } from '../../utils/tokenEstimator';
import { SteeringModal } from '../SteeringModal';

export function OverviewTab() {
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

  const [steeringTarget, setSteeringTarget] = useState<
    { type: 'logline' } | { type: 'beat'; index: number; name: string } | null
  >(null);

  if (!activeProject) return null;

  const { macroOutline, rollingSummary, metadata } = activeProject;

  const handleConfirmRegen = async (steeringPrompt: string) => {
    if (!steeringTarget) return;
    const target = steeringTarget;
    setSteeringTarget(null);

    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }

    const controller = startGeneration(
      target.type === 'logline'
        ? 'กำลังคิด Logline ใหม่...'
        : `กำลังสร้างจังหวะ "${target.name}" ใหม่...`
    );

    try {
      if (target.type === 'logline') {
        const nextLogline = await regenerateLogline({
          apiKey,
          settings: aiSettings,
          project: activeProject,
          steeringPrompt,
          signal: controller.signal,
          onRetry: (a, ms) =>
            updateGenerationLabel(`ลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วิ)...`),
        });
        await updateActiveProject((p) => {
          p.macroOutline.logline = nextLogline;
          return p;
        });
        addToast({ type: 'success', title: 'อัปเดต Logline ใหม่แล้ว (กด Undo ได้หากต้องการย้อนกลับ)' });
      } else {
        const nextBeat = await regenerateSingleBeat({
          apiKey,
          settings: aiSettings,
          project: activeProject,
          beatIndex: target.index,
          steeringPrompt,
          signal: controller.signal,
          onRetry: (a, ms) =>
            updateGenerationLabel(`ลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วิ)...`),
        });
        await updateActiveProject((p) => {
          p.macroOutline.plotBeats[target.index] = nextBeat;
          return p;
        });
        addToast({ type: 'success', title: `อัปเดตจังหวะ "${nextBeat.beatName}" แล้ว` });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'สร้างใหม่ไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      endGeneration();
    }
  };

  const moveBeat = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= macroOutline.plotBeats.length) return;
    updateActiveProject((p) => {
      const arr = p.macroOutline.plotBeats;
      [arr[index], arr[nextIdx]] = [arr[nextIdx], arr[index]];
      return p;
    });
  };

  const addBeat = () => {
    updateActiveProject((p) => {
      p.macroOutline.plotBeats.push({
        id: `beat-${Date.now()}`,
        beatName: 'จังหวะใหม่',
        act: 'องก์เพิ่มเติม',
        summary: 'ระบุเหตุการณ์สำคัญในช่วงนี้...',
      });
      return p;
    });
  };

  const handleCompressSummary = async () => {
    if (!rollingSummary.trim()) return;
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }
    const beforeTokens = estimateTokens(rollingSummary);
    const controller = startGeneration('กำลังบีบอัด Rolling Summary ให้กระชับเพื่อประหยัด Token...');
    try {
      const compressed = await compressRollingSummary({
        apiKey,
        settings: aiSettings,
        rollingSummary,
        signal: controller.signal,
        onRetry: (a, ms) =>
          updateGenerationLabel(`ลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วิ)...`),
      });
      await updateActiveProject((p) => {
        p.rollingSummary = compressed;
        return p;
      });
      const afterTokens = estimateTokens(compressed);
      addToast({
        type: 'success',
        title: 'บีบอัด Rolling Summary เรียบร้อย!',
        description: `ลดจาก ~${beforeTokens} เหลือ ~${afterTokens} tokens`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'บีบอัดสรุปไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      endGeneration();
    }
  };

  return (
    <div className="space-y-6">
      {/* Logline Card */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-stone-900">แก่นเรื่อง (Logline)</h2>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => setSteeringTarget({ type: 'logline' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            เจน Logline ใหม่
          </button>
        </div>

        <textarea
          rows={3}
          value={macroOutline.logline}
          onChange={(e) =>
            updateActiveProject(
              (p) => {
                p.macroOutline.logline = e.target.value;
                return p;
              },
              false
            )
          }
          className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
          <span className="px-2.5 py-1 rounded-lg bg-stone-100">โทน: {metadata.tone}</span>
          <span className="px-2.5 py-1 rounded-lg bg-stone-100">กลุ่มเป้าหมาย: {metadata.targetAudience}</span>
          <span className="px-2.5 py-1 rounded-lg bg-stone-100">ทฤษฎี: {metadata.structureTemplate}</span>
          <span className="px-2.5 py-1 rounded-lg bg-stone-100">
            เป้าหมาย: {metadata.targetChapterCount} ตอน
          </span>
        </div>
      </section>

      {/* Rolling Summary Card */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900">
              สรุปเหตุการณ์สะสมล่าสุด (Rolling Summary)
            </h2>
            {rollingSummary.trim() && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                ~{estimateTokens(rollingSummary)} tok
              </span>
            )}
          </div>
          {rollingSummary.trim().length > 100 && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleCompressSummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              บีบอัดสรุป (ประหยัด Token)
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-3">
          ระบบจะอัปเดตช่องนี้ให้อัตโนมัติทุกครั้งที่เจนตอนชุดใหม่ และส่งให้ AI อ่านเพื่อป้องกันพล็อตขัดแย้ง (คุณสามารถแก้ไขเองได้หากมีการปรับเนื้อหาตอนเก่า)
        </p>
        <textarea
          rows={3}
          value={rollingSummary}
          onChange={(e) =>
            updateActiveProject(
              (p) => {
                p.rollingSummary = e.target.value;
                return p;
              },
              false
            )
          }
          placeholder="ยังไม่มีสรุปเหตุการณ์สะสม (จะถูกสร้างอัตโนมัติเมื่อคุณเริ่มสร้างตอนชุดแรกในแท็บ โครงสร้างรายตอน)"
          className="w-full rounded-xl border border-stone-200 bg-amber-50/30 px-4 py-3 text-sm text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </section>

      {/* Plot Beats Timeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-stone-900">
              ไทม์ไลน์โครงเรื่องหลัก ({macroOutline.plotBeats.length} จังหวะ)
            </h2>
          </div>
          <button
            type="button"
            onClick={addBeat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มจังหวะเรื่อง
          </button>
        </div>

        <div className="space-y-3">
          {macroOutline.plotBeats.map((beat, idx) => (
            <div
              key={beat.id ?? idx}
              className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 hover:border-stone-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={beat.act}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.macroOutline.plotBeats[idx].act = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="text-xs font-semibold text-indigo-700 bg-indigo-50/70 rounded-lg px-2.5 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={beat.beatName}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.macroOutline.plotBeats[idx].beatName = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="text-sm font-bold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-white rounded-lg px-2 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveBeat(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBeat(idx, 1)}
                    disabled={idx === macroOutline.plotBeats.length - 1}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30"
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() =>
                      setSteeringTarget({ type: 'beat', index: idx, name: beat.beatName })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                    title="สั่ง AI เจนจังหวะนี้ใหม่"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    เจนใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveProject((p) => {
                        p.macroOutline.plotBeats.splice(idx, 1);
                        return p;
                      })
                    }
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    title="ลบจังหวะนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={beat.summary}
                onChange={(e) =>
                  updateActiveProject(
                    (p) => {
                      p.macroOutline.plotBeats[idx].summary = e.target.value;
                      return p;
                    },
                    false
                  )
                }
                className="w-full rounded-xl border border-stone-200/80 bg-stone-50/40 px-3.5 py-2.5 text-sm text-stone-700 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
      </section>

      <SteeringModal
        open={Boolean(steeringTarget)}
        title={
          steeringTarget?.type === 'logline'
            ? 'สร้าง Logline ใหม่ด้วย AI'
            : `สร้างจังหวะ "${steeringTarget?.name ?? ''}" ใหม่`
        }
        description="AI จะอ้างอิงโครงเรื่องและข้อมูลปักหมุดทั้งหมดเพื่อสร้างส่วนนี้ใหม่โดยไม่กระทบส่วนอื่น"
        onClose={() => setSteeringTarget(null)}
        onConfirm={handleConfirmRegen}
      />
    </div>
  );
}
