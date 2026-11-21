import { useRef } from 'react';
import { BookOpenText, KeyRound, Upload, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { parseImportedProjectJson } from '../utils/exporter';

export function Header() {
  const {
    view,
    setView,
    isAIConfigured,
    apiStatus,
    aiSettings,
    setApiModalOpen,
    importProjectBackup,
    addToast,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const project = parseImportedProjectJson(text);
      await importProjectBackup(project);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'นำเข้าไฟล์ Backup ไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'รูปแบบไฟล์ JSON ไม่ถูกต้องตามสเปก',
      });
    } finally {
      e.target.value = '';
    }
  };

  const isConnected = isAIConfigured() && apiStatus !== 'error';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {view !== 'dashboard' && (
            <button
              onClick={() => setView('dashboard')}
              className="p-2 -ml-1 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="กลับไปคลังโปรเจกต์"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <BookOpenText className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-stone-900 text-base tracking-tight block">
                PlotCraft TH
              </span>
              <span className="text-[11px] text-stone-500 hidden sm:block">
                ผู้ช่วยวางโครงสร้างนิยายภาษาไทยด้วย AI
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === 'dashboard' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJson}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/80 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import Backup (.json)</span>
                <span className="sm:hidden">Import</span>
              </button>
            </>
          )}

          <button
            onClick={() => setApiModalOpen(true)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden md:inline max-w-[200px] truncate">
              {isConnected ? `${aiSettings.model}` : 'ตั้งค่า AI API'}
            </span>
            <span className="md:hidden">{isConnected ? 'AI พร้อมใช้' : 'ตั้งค่า AI'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
