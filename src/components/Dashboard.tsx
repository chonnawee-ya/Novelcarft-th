import { useState } from 'react';
import {
  BookMarked,
  Copy,
  Download,
  FolderOpen,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { exportAsJson } from '../utils/exporter';

export function Dashboard() {
  const {
    projects,
    isAIConfigured,
    setView,
    setApiModalOpen,
    openProject,
    duplicateProject,
    deleteProject,
  } = useAppStore();

  const [query, setQuery] = useState('');

  const filtered = projects.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.metadata.title.toLowerCase().includes(q) ||
      p.metadata.genres.some((g) => g.toLowerCase().includes(q)) ||
      p.macroOutline.logline.toLowerCase().includes(q)
    );
  });

  const handleStartNew = () => {
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }
    setView('wizard');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white p-6 sm:p-8 mb-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Structured Thai Novel Outliner • รองรับ AI ทุกค่าย (OpenRouter / Gemini / OpenAI / Claude / Ollama)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              คลังโครงเรื่องนิยายของคุณ
            </h1>
            <p className="text-indigo-100/90 text-sm mt-2 leading-relaxed">
              วางโครงเรื่องตาม 7 ทฤษฎีการเล่าเรื่องสากล ผสมแนวนิยายได้อิสระ ปักหมุด Lore Bible คุมพล็อตไม่ให้หลุด
              และแตกโครงเรื่องรายตอนทีละ 5 ตอน พร้อมส่งออกเป็น Markdown / Text / JSON ได้ทันที
            </p>
          </div>

          <button
            onClick={handleStartNew}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-indigo-950 font-bold text-sm hover:bg-indigo-50 shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            สร้างโครงเรื่องใหม่
          </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-stone-700">
          <BookMarked className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold">โปรเจกต์ทั้งหมด ({projects.length})</h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อเรื่อง แนวนิยาย หรือแก่นเรื่อง..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">ยังไม่มีโครงเรื่องนิยายในคลัง</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            เริ่มต้นด้วยการตั้งค่า Gemini API Key แล้วสร้างโครงเรื่องใหม่จากไอเดียตั้งต้น หรือนำเข้าโน้ตเดิมของคุณได้เลย
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!isAIConfigured() && (
              <button
                onClick={() => setApiModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                1. ตั้งค่า AI Provider & API Key
              </button>
            )}
            <button
              onClick={handleStartNew}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              สร้างโครงเรื่องแรกของคุณ
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-stone-500 text-sm">
          ไม่พบโปรเจกต์ที่ตรงกับคำค้นหา "{query}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project) => {
            const progressPct = Math.min(
              100,
              Math.round((project.chapters.length / Math.max(1, project.metadata.targetChapterCount)) * 100)
            );
            const updatedDate = new Date(project.metadata.updatedAt).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={project.projectId}
                className="group bg-white rounded-2xl border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                <div
                  onClick={() => openProject(project.projectId)}
                  className="p-5 flex-1 cursor-pointer"
                >
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {project.metadata.genres.map((g) => (
                      <span
                        key={g}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-base font-bold text-stone-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                    {project.metadata.title}
                  </h3>

                  <p className="text-xs text-stone-600 mt-1.5 line-clamp-3 leading-relaxed">
                    {project.macroOutline.logline}
                  </p>

                  <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{project.metadata.structureTemplate}</span>
                      <span className="font-semibold text-stone-700">
                        {project.chapters.length} / {project.metadata.targetChapterCount} ตอน
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">แก้ไขล่าสุด {updatedDate}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openProject(project.projectId)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                      title="เปิดทำงาน"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportAsJson(project)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                      title="สำรองไฟล์ JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateProject(project.projectId)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                      title="ทำสำเนา"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`ต้องการลบโปรเจกต์ "${project.metadata.title}" ใช่หรือไม่?`)) {
                          deleteProject(project.projectId);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="ลบโปรเจกต์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
