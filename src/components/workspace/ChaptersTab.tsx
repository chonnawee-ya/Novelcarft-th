import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  ListOrdered,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateChapterBatch, regenerateSingleChapter } from '../../services/geminiService';
import { SteeringModal } from '../SteeringModal';

export function ChaptersTab() {
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

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [regenChapterIdx, setRegenChapterIdx] = useState<number | null>(null);

  if (!activeProject) return null;

  const { chapters, metadata } = activeProject;
  const defaultBatchSize = aiSettings.economyMode ? 3 : 5;
  const remaining = Math.max(0, metadata.targetChapterCount - chapters.length);
  const nextBatchCount = remaining > 0 ? Math.min(defaultBatchSize, remaining) : defaultBatchSize;

  const handleGenerateBatch = async (steeringPrompt: string) => {
    setBatchModalOpen(false);
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }

    const startNum = chapters.length + 1;
    const endNum = startNum + nextBatchCount - 1;
    const controller = startGeneration(
      `Stage 2: กำลังแตกโครงสร้างตอนที่ ${startNum}–${endNum} พร้อมอัปเดต Rolling Summary...`
    );

    try {
      const result = await generateChapterBatch({
        apiKey,
        settings: aiSettings,
        project: activeProject,
        batchSize: nextBatchCount,
        steeringPrompt,
        signal: controller.signal,
        onRetry: (a, ms) =>
          updateGenerationLabel(
            `กำลังลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วินาที)...`
          ),
      });

      await updateActiveProject((p) => {
        const baseNum = p.chapters.length;
        const normalized = result.chapters.map((ch, idx) => ({
          ...ch,
          chapterNumber: baseNum + idx + 1,
        }));
        p.chapters.push(...normalized);
        p.rollingSummary = result.updatedRollingSummary;
        return p;
      });

      addToast({
        type: 'success',
        title: `สร้างตอนที่ ${startNum}–${startNum + result.chapters.length - 1} สำเร็จ!`,
        description: 'อัปเดต Rolling Summary อัตโนมัติเรียบร้อยแล้ว',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'สร้างชุดตอนไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      endGeneration();
    }
  };

  const handleRegenChapter = async (steeringPrompt: string) => {
    if (regenChapterIdx === null) return;
    const idx = regenChapterIdx;
    setRegenChapterIdx(null);

    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }

    const targetNum = chapters[idx].chapterNumber;
    const controller = startGeneration(`กำลังสร้างโครงสร้างตอนที่ ${targetNum} ใหม่...`);

    try {
      const updated = await regenerateSingleChapter({
        apiKey,
        settings: aiSettings,
        project: activeProject,
        chapterIndex: idx,
        steeringPrompt,
        signal: controller.signal,
        onRetry: (a, ms) =>
          updateGenerationLabel(`ลองใหม่ครั้งที่ ${a} (รอ ${Math.round(ms / 1000)} วิ)...`),
      });

      await updateActiveProject((p) => {
        p.chapters[idx] = updated;
        return p;
      });

      addToast({
        type: 'success',
        title: `สร้างตอนที่ ${targetNum} ใหม่เรียบร้อยแล้ว`,
        description: 'หากต้องการใช้ฉบับเดิมสามารถกด Undo ด้านบนได้',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'เจนตอนใหม่ไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      endGeneration();
    }
  };

  const moveChapter = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= chapters.length) return;
    updateActiveProject((p) => {
      const arr = p.chapters;
      [arr[idx], arr[nextIdx]] = [arr[nextIdx], arr[idx]];
      arr.forEach((ch, i) => {
        ch.chapterNumber = i + 1;
      });
      return p;
    });
  };

  const deleteChapter = (idx: number) => {
    updateActiveProject((p) => {
      p.chapters.splice(idx, 1);
      p.chapters.forEach((ch, i) => {
        ch.chapterNumber = i + 1;
      });
      return p;
    });
  };

  const addManualChapter = () => {
    updateActiveProject((p) => {
      p.chapters.push({
        chapterNumber: p.chapters.length + 1,
        title: `ตอนที่ ${p.chapters.length + 1}`,
        linkedBeat: '',
        goal: '',
        conflict: '',
        outcome: '',
        cliffhanger: '',
        summary: '',
        content: '',
      });
      return p;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-stone-900">
              โครงสร้างรายตอน (Chapter Beats • {chapters.length} / {metadata.targetChapterCount} ตอน)
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            AI จะสร้างทีละชุด (สูงสุด 5 ตอน) โดยอ้างอิงข้อมูลที่ปักหมุดและ Rolling Summary เพื่อคุมพล็อตไม่ให้หลุด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addManualChapter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตอนเอง
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => setBatchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            + สร้าง {nextBatchCount} ตอนถัดไป
          </button>
        </div>
      </div>

      {/* Empty State */}
      {chapters.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <BookOpenCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">พร้อมแตกโครงสร้างรายตอน (Stage 2)</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            ตรวจสอบโครงเรื่องหลัก โลก และตัวละครที่ปักหมุดไว้ให้เรียบร้อย จากนั้นกดปุ่มด้านล่างเพื่อให้ AI สร้างตอนที่ 1–{nextBatchCount} ได้เลย
          </p>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => setBatchModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            สร้างตอนที่ 1–{nextBatchCount} ด้วย AI
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map((ch, idx) => (
            <div
              key={`${ch.chapterNumber}-${idx}`}
              className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 hover:border-stone-300 transition-colors"
            >
              {/* Chapter Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0">
                    ตอนที่ {ch.chapterNumber}
                  </span>
                  <input
                    type="text"
                    value={ch.title}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.chapters[idx].title = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="text-base font-bold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-white rounded-lg px-2 py-0.5 flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {ch.linkedBeat && (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60">
                      {ch.linkedBeat}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveChapter(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveChapter(idx, 1)}
                    disabled={idx === chapters.length - 1}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30"
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setRegenChapterIdx(idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                    title="สั่ง AI เจนตอนนี้ใหม่"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    เจนใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChapter(idx)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    title="ลบตอนนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 4-Beat Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                    เป้าหมายในตอน (Goal)
                  </label>
                  <textarea
                    rows={2}
                    value={ch.goal}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.chapters[idx].goal = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                    อุปสรรค / ความขัดแย้ง (Conflict)
                  </label>
                  <textarea
                    rows={2}
                    value={ch.conflict}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.chapters[idx].conflict = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-sky-700 mb-1">
                    ผลลัพธ์ของเหตุการณ์ (Outcome)
                  </label>
                  <textarea
                    rows={2}
                    value={ch.outcome}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.chapters[idx].outcome = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-700 mb-1">
                    จุดทิ้งท้ายชวนติดตาม (Cliffhanger)
                  </label>
                  <textarea
                    rows={2}
                    value={ch.cliffhanger}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => {
                          p.chapters[idx].cliffhanger = e.target.value;
                          return p;
                        },
                        false
                      )
                    }
                    className="w-full rounded-xl border border-amber-200/80 bg-amber-50/30 px-3 py-2 text-xs text-stone-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                  สรุปเหตุการณ์ย่อรายตอน (Summary)
                </label>
                <textarea
                  rows={2}
                  value={ch.summary}
                  onChange={(e) =>
                    updateActiveProject(
                      (p) => {
                        p.chapters[idx].summary = e.target.value;
                        return p;
                      },
                      false
                    )
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2 text-xs text-stone-700 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}

          {/* Bottom CTA for next batch */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setBatchModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              + สร้าง {nextBatchCount} ตอนถัดไป (ตอนที่ {chapters.length + 1}–{chapters.length + nextBatchCount})
            </button>
          </div>
        </div>
      )}

      {/* Batch Generation Steering Modal */}
      <SteeringModal
        open={batchModalOpen}
        title={`สร้างโครงสร้างตอนที่ ${chapters.length + 1}–${chapters.length + nextBatchCount}`}
        description="AI จะอ่านข้อมูลโลกและตัวละครที่ปักหมุดไว้ รวมถึง Rolling Summary ล่าสุด เพื่อแตกโครงเรื่องชุดถัดไปอย่างต่อเนื่อง"
        placeholder="เช่น ช่วง 5 ตอนนี้อยากให้เน้นการสืบหาเบาะแสในโรงเรียน และเปิดตัวคู่ปรับคนใหม่ (เว้นว่างได้)"
        confirmLabel={`สร้าง ${nextBatchCount} ตอนเลย`}
        onClose={() => setBatchModalOpen(false)}
        onConfirm={handleGenerateBatch}
      />

      {/* Single Chapter Regeneration Steering Modal */}
      <SteeringModal
        open={regenChapterIdx !== null}
        title={
          regenChapterIdx !== null
            ? `สร้างโครงสร้างตอนที่ ${chapters[regenChapterIdx]?.chapterNumber} ใหม่`
            : ''
        }
        description="AI จะเขียนโครงสร้างใหม่เฉพาะตอนนี้ โดยยังเชื่อมโยงกับตอนก่อนหน้าและตอนถัดไปให้สมเหตุสมผล"
        placeholder="เช่น อยากให้เปลี่ยนจุดหักมุมท้ายตอนให้ตัวเอกจับได้ว่าเพื่อนสนิทเป็นคนทรยศ"
        confirmLabel="เจนตอนนี้ใหม่"
        onClose={() => setRegenChapterIdx(null)}
        onConfirm={handleRegenChapter}
      />
    </div>
  );
}
