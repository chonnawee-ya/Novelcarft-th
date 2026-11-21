import { useState } from 'react';
import {
  BookText,
  CheckCircle2,
  Download,
  FileCode2,
  FileText,
  Globe2,
  ListOrdered,
  Loader2,
  Undo2,
  Users,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { exportAsJson, exportAsMarkdown, exportAsPlainText } from '../utils/exporter';
import { OverviewTab } from './workspace/OverviewTab';
import { WorldBuildingTab } from './workspace/WorldBuildingTab';
import { CharactersTab } from './workspace/CharactersTab';
import { ChaptersTab } from './workspace/ChaptersTab';
import type { WorkspaceTab } from '../types/novel';

export function Workspace() {
  const {
    activeProject,
    activeTab,
    setActiveTab,
    updateActiveProject,
    undoStack,
    undoActiveProject,
    lastSavedAt,
    isGenerating,
    generationLabel,
    cancelGeneration,
  } = useAppStore();

  const [exportOpen, setExportOpen] = useState(false);

  if (!activeProject) return null;

  const tabs: { id: WorkspaceTab; label: string; icon: typeof BookText; badge?: number }[] = [
    {
      id: 'overview',
      label: 'ภาพรวม & โครงเรื่องหลัก',
      icon: BookText,
      badge: activeProject.macroOutline.plotBeats.length,
    },
    {
      id: 'world',
      label: 'โลกและกฎเกณฑ์',
      icon: Globe2,
      badge: activeProject.macroOutline.worldBuilding.length,
    },
    {
      id: 'characters',
      label: 'ตัวละคร',
      icon: Users,
      badge: activeProject.macroOutline.characters.length,
    },
    {
      id: 'chapters',
      label: 'โครงสร้างรายตอน',
      icon: ListOrdered,
      badge: activeProject.chapters.length,
    },
  ];

  const savedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Workspace Top Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {activeProject.metadata.genres.map((g) => (
              <span
                key={g}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"
              >
                {g}
              </span>
            ))}
            <span className="text-[11px] text-stone-400">
              • {activeProject.metadata.structureTemplate}
            </span>
          </div>
          <input
            type="text"
            value={activeProject.metadata.title}
            onChange={(e) =>
              updateActiveProject(
                (p) => {
                  p.metadata.title = e.target.value;
                  return p;
                },
                false
              )
            }
            className="text-xl sm:text-2xl font-bold text-stone-900 bg-transparent hover:bg-stone-50 focus:bg-white rounded-lg px-1.5 -ml-1.5 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            บันทึกอัตโนมัติ{savedTime ? ` (${savedTime})` : ''}
          </span>

          <button
            type="button"
            onClick={undoActiveProject}
            disabled={undoStack.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            title="ย้อนกลับก่อนการเจนหรือการลบครั้งล่าสุด"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo ({undoStack.length})
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-20">
                  <button
                    type="button"
                    onClick={() => {
                      exportAsMarkdown(activeProject);
                      setExportOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-stone-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="font-semibold">Markdown (.md)</p>
                      <p className="text-[10px] text-stone-400">พร้อมเปิดใน Obsidian / Notion</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportAsPlainText(activeProject);
                      setExportOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-stone-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-stone-500" />
                    <div>
                      <p className="font-semibold">Plain Text (.txt)</p>
                      <p className="text-[10px] text-stone-400">อ่านง่ายบนมือถือและส่งต่อ</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportAsJson(activeProject);
                      setExportOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-stone-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5"
                  >
                    <FileCode2 className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-semibold">JSON Backup (.json)</p>
                      <p className="text-[10px] text-stone-400">สำรองข้อมูล / ย้ายเครื่อง</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inline AI Generation Progress Banner */}
      {isGenerating && (
        <div className="mb-5 rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-indigo-950 truncate">
              {generationLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelGeneration}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 shrink-0"
          >
            <XCircle className="w-3.5 h-3.5" />
            ยกเลิก
          </button>
        </div>
      )}

      {/* 4 Workspace Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 border-b border-stone-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-stone-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'world' && <WorldBuildingTab />}
      {activeTab === 'characters' && <CharactersTab />}
      {activeTab === 'chapters' && <ChaptersTab />}
    </main>
  );
}
