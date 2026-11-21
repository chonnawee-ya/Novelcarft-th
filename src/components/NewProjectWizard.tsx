import { useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import {
  AUDIENCE_PRESETS,
  GENRES,
  STORY_STRUCTURES,
  TONE_PRESETS,
} from '../data/knowledgeBase';
import { useAppStore } from '../store/useAppStore';
import { generateMacroOutline } from '../services/geminiService';
import { SCHEMA_VERSION, type NovelProject } from '../types/novel';

export function NewProjectWizard() {
  const {
    apiKey,
    aiSettings,
    isAIConfigured,
    setApiModalOpen,
    createAndOpenProject,
    isGenerating,
    generationLabel,
    startGeneration,
    updateGenerationLabel,
    endGeneration,
    cancelGeneration,
    addToast,
  } = useAppStore();

  const [mode, setMode] = useState<'scratch' | 'import'>('scratch');
  const [title, setTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['แฟนตาซี']);
  const [structureId, setStructureId] = useState(STORY_STRUCTURES[1].id); // Save the Cat!
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [tone, setTone] = useState(TONE_PRESETS[0]);
  const [targetAudience, setTargetAudience] = useState(AUDIENCE_PRESETS[0]);
  const [targetChapterCount, setTargetChapterCount] = useState(20);
  const [seedIdea, setSeedIdea] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleGenre = (nameTh: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(nameTh)) {
        return prev.length > 1 ? prev.filter((g) => g !== nameTh) : prev;
      }
      if (prev.length >= 3) {
        addToast({
          type: 'warning',
          title: 'เลือกได้สูงสุด 3 แนวนิยาย',
          description: 'เพื่อไม่ให้โทนเรื่องและโครงสร้างสับสนเกินไป',
        });
        return prev;
      }
      return [...prev, nameTh];
    });
  };

  const handleUploadNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      addToast({
        type: 'warning',
        title: 'ไฟล์มีขนาดใหญ่เกินไป',
        description: 'รองรับไฟล์ .txt / .md ขนาดไม่เกิน 500 KB เพื่อรักษาคุณภาพบริบท AI',
      });
      e.target.value = '';
      return;
    }
    const text = await file.text();
    setSeedIdea(text);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.(txt|md)$/i, ''));
    }
    addToast({ type: 'success', title: `โหลดไฟล์ "${file.name}" เรียบร้อยแล้ว` });
    e.target.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      addToast({ type: 'warning', title: 'กรุณาตั้งค่า AI Provider และโมเดลก่อนเริ่มสร้างโครงเรื่อง' });
      return;
    }
    if (seedIdea.trim().length < 15) {
      addToast({
        type: 'warning',
        title: 'กรุณาใส่ไอเดียตั้งต้นหรือโน้ตอย่างน้อย 15 ตัวอักษร',
      });
      return;
    }

    const controller = startGeneration(
      'Stage 1: กำลังวิเคราะห์ไอเดียและสร้างโครงสร้างมหภาค (Logline, โลก, ตัวละคร, Plot Beats)...'
    );

    try {
      const result = await generateMacroOutline({
        apiKey,
        settings: aiSettings,
        input: {
          mode,
          title,
          genres: selectedGenres,
          structureTemplateId: structureId,
          tone,
          targetAudience,
          targetChapterCount,
          seedIdea,
        },
        signal: controller.signal,
        onRetry: (attempt, waitMs) => {
          updateGenerationLabel(
            `กำลังลองเชื่อมต่อใหม่ครั้งที่ ${attempt} (รอ ${Math.round(waitMs / 1000)} วินาที เนื่องจาก Rate Limit)...`
          );
        },
      });

      const now = new Date().toISOString();
      const newProject: NovelProject = {
        schemaVersion: SCHEMA_VERSION,
        projectId: crypto.randomUUID(),
        metadata: {
          title: title.trim() || result.suggestedTitle || 'นิยายเรื่องใหม่',
          genres: selectedGenres,
          structureTemplate: structureId,
          tone,
          targetAudience,
          targetChapterCount,
          seedIdea: seedIdea.trim(),
          createdAt: now,
          updatedAt: now,
        },
        macroOutline: {
          logline: result.logline,
          worldBuilding: result.worldBuilding.map((wb, i) => ({
            id: `wb-${Date.now()}-${i}`,
            category: wb.category,
            detail: wb.detail,
            isPinned: true,
          })),
          characters: result.characters.map((c, i) => ({
            id: `char-${Date.now()}-${i}`,
            name: c.name,
            role: c.role,
            archetype: c.archetype,
            goal: c.goal,
            flaw: c.flaw,
            background: c.background,
            relationships: c.relationships,
            isPinned: true,
          })),
          plotBeats: result.plotBeats.map((b, i) => ({
            id: `beat-${Date.now()}-${i}`,
            beatName: b.beatName,
            act: b.act,
            summary: b.summary,
          })),
        },
        rollingSummary: '',
        chapters: [],
      };

      await createAndOpenProject(newProject);
      addToast({
        type: 'success',
        title: 'สร้างโครงสร้างมหภาค (Stage 1) สำเร็จ!',
        description: 'คุณสามารถตรวจสอบ แก้ไข ปักหมุด และเริ่มแตกโครงเรื่องรายตอนได้เลย',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดระหว่างสร้างโครงเรื่อง';
      addToast({
        type: 'error',
        title: 'ไม่สามารถสร้างโครงเรื่องได้',
        description: msg,
      });
    } finally {
      endGeneration();
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">สร้างโครงเรื่องนิยายใหม่</h1>
        <p className="text-sm text-stone-500 mt-1">
          กำหนดแนวนิยาย เลือกทฤษฎีการเล่าเรื่อง และใส่ไอเดียตั้งต้น เพื่อให้ AI วางโครงสร้างมหภาค (Stage 1)
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMode('scratch')}
          className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
            mode === 'scratch'
              ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900">เริ่มจากไอเดียตั้งต้น</p>
            <p className="text-xs text-stone-500 mt-0.5">พิมพ์พล็อตย่อสั้นๆ ให้ AI ช่วยขยายโครงสร้าง</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('import')}
          className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
            mode === 'import'
              ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900">นำเข้าโน้ตเดิม (Import Draft)</p>
            <p className="text-xs text-stone-500 mt-0.5">วางโน้ตหรืออัปโหลด .txt / .md ให้ AI จัดระเบียบ</p>
          </div>
        </button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Title & Seed Idea */}
        <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-800 mb-1.5">
              ชื่อเรื่องนิยาย <span className="font-normal text-stone-400">(เว้นว่างได้เพื่อให้ AI ช่วยคิด)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น เงาจันทราแห่งนครต้องห้าม"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-stone-800">
                {mode === 'scratch' ? 'ไอเดียตั้งต้น / พล็อตหลัก (Prompt)' : 'โน้ตย่อ / ร่างโครงเรื่องเดิม'}
              </label>
              {mode === 'import' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    onChange={handleUploadNotes}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    อัปโหลด .txt / .md
                  </button>
                </>
              )}
            </div>
            <textarea
              rows={mode === 'import' ? 7 : 4}
              value={seedIdea}
              onChange={(e) => setSeedIdea(e.target.value)}
              placeholder={
                mode === 'scratch'
                  ? 'เช่น นักชันสูตรศพสาวในกรุงเทพฯ ค้นพบว่าเหยื่อคดีฆาตกรรมต่อเนื่องทุกรายมีรอยสักอักขระโบราณที่เชื่อมโยงกับคดีการหายตัวไปของพี่ชายเธอเมื่อ 10 ปีก่อน...'
                  : 'วางโน้ตไอเดีย ตัวละคร ฉาก หรือโครงเรื่องร่างเดิมของคุณที่นี่ AI จะสกัดและจัดเรียงลงโครงสร้างโดยยึดไอเดียเดิมของคุณเป็นหลัก...'
              }
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              required
            />
            <div className="flex justify-between text-[11px] text-stone-400 mt-1">
              <span>ยิ่งระบุปมขัดแย้งหรือจุดเด่นชัด AI ยิ่งวางโครงได้แม่นยำ</span>
              <span>{seedIdea.length.toLocaleString()} ตัวอักษร</span>
            </div>
          </div>
        </section>

        {/* Multi-Genre Picker */}
        <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-stone-800">แนวนิยาย (เลือกได้ 1–3 แนวเพื่อผสมผสาน)</h2>
              <p className="text-xs text-stone-500">เลือกแล้ว: {selectedGenres.join(' + ')}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
              {selectedGenres.length} / 3
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {GENRES.map((g) => {
              const active = selectedGenres.includes(g.nameTh);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.nameTh)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    active
                      ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-900">
                      {g.nameTh} <span className="text-xs font-normal text-stone-400">({g.nameEn})</span>
                    </span>
                    {active && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">{g.subGenres.join(' • ')}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Story Structure Templates */}
        <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-stone-800">เลือกทฤษฎีโครงสร้างการเล่าเรื่อง (7 ทฤษฎีสากล)</h2>
          </div>

          <div className="space-y-2.5">
            {STORY_STRUCTURES.map((tpl) => {
              const selected = structureId === tpl.id;
              const isExpanded = expandedTemplate === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className={`rounded-xl border transition-all ${
                    selected
                      ? 'bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-500'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="p-3.5 flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStructureId(tpl.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">{tpl.name}</span>
                        <span className="text-xs text-indigo-700 font-medium">{tpl.nameTh}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {tpl.beatCount} จังหวะ
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">{tpl.shortDesc}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{tpl.bestFor}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedTemplate(isExpanded ? null : tpl.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 shrink-0"
                      title="ดูรายละเอียดจังหวะเรื่อง"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3.5 pt-2 border-t border-stone-200/70 bg-white/70 rounded-b-xl">
                      <ol className="space-y-1.5 text-xs text-stone-600">
                        {tpl.beats.map((b, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="font-mono text-stone-400 w-5 shrink-0">{idx + 1}.</span>
                            <div>
                              <span className="font-semibold text-stone-800">{b.beatName}</span>{' '}
                              <span className="text-stone-500">— {b.hint}</span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Tone, Audience, Chapter Count */}
        <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-bold text-stone-800 mb-1.5">โทนเรื่อง (Tone)</label>
            <input
              type="text"
              list="tone-presets"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="tone-presets">
              {TONE_PRESETS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-800 mb-1.5">กลุ่มเป้าหมาย</label>
            <input
              type="text"
              list="audience-presets"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="audience-presets">
              {AUDIENCE_PRESETS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-stone-800">จำนวนตอนเป้าหมาย</label>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {targetChapterCount} ตอน
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={targetChapterCount}
              onChange={(e) => setTargetChapterCount(Number(e.target.value))}
              className="w-full accent-indigo-600 mt-1"
            />
            <div className="flex justify-between text-[11px] text-stone-400">
              <span>5 ตอน (เรื่องสั้น)</span>
              <span>30 ตอน</span>
              <span>60 ตอน</span>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            เริ่มสร้างโครงสร้างมหภาค (Stage 1)
          </button>
        </div>
      </form>

      {/* Progress Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">AI กำลังออกแบบโครงเรื่องของคุณ</h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{generationLabel}</p>
            </div>
            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full animate-pulse w-2/3" />
            </div>
            <button
              type="button"
              onClick={cancelGeneration}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              ยกเลิกการสร้าง
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
