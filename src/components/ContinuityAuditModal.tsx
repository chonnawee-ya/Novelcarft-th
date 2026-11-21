import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { auditProjectContinuity } from '../services/geminiService';
import type { ContinuityReport } from '../types/novel';

interface ContinuityAuditModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContinuityAuditModal({ open, onClose }: ContinuityAuditModalProps) {
  const { activeProject, apiKey, aiSettings, isAIConfigured, setApiModalOpen, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ContinuityReport | null>(null);

  if (!open || !activeProject) return null;

  const runAudit = async () => {
    if (!isAIConfigured()) {
      setApiModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await auditProjectContinuity({
        apiKey,
        settings: aiSettings,
        project: activeProject,
      });
      setReport(res);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'ตรวจสอบพล็อตโฮลไม่สำเร็จ',
        description: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      setLoading(false);
    }
  };

  const severityStyle = (sev: 'high' | 'medium' | 'low') => {
    if (sev === 'high') return { badge: 'bg-rose-100 text-rose-800', border: 'border-rose-200 bg-rose-50/40', label: 'สำคัญมาก' };
    if (sev === 'medium') return { badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200 bg-amber-50/40', label: 'ควรปรับปรุง' };
    return { badge: 'bg-sky-100 text-sky-800', border: 'border-sky-200 bg-sky-50/40', label: 'ข้อเสนอแนะ' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">AI บรรณาธิการตรวจพล็อตโฮล (Continuity Audit)</h2>
              <p className="text-xs text-stone-500">ตรวจสอบความขัดแย้งของกฎโลก ตัวละคร และจังหวะเรื่องทั้งโปรเจกต์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {!report && !loading && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-stone-900">พร้อมตรวจสอบโครงเรื่องทั้งหมด</h3>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  AI จะอ่าน Logline, Lore ปักหมุด, ตัวละคร, Plot Beats และตอนทั้งหมด ({activeProject.chapters.length} ตอน)
                  เพื่อหาจุดขัดแย้ง ชื่อเพี้ยน หรือช่วงที่จังหวะเรื่องยืดเยื้อพร้อมแนะนำวิธีแก้
                </p>
              </div>
              <button
                type="button"
                onClick={runAudit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                เริ่มตรวจพล็อตโฮลตอนนี้
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-stone-800">AI บรรณาธิการกำลังไล่ตรวจโครงเรื่องของคุณ...</p>
              <p className="text-xs text-stone-500">กำลังเช็กความสอดคล้องของกฎโลก ตัวละคร และไทม์ไลน์ทุกตอน</p>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-4">
              {/* Score Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center shrink-0">
                  <span className="text-xl font-extrabold leading-none">{report.overallScore}</span>
                  <span className="text-[10px] opacity-80">/ 100</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-stone-700 uppercase tracking-wide">สรุปผลการตรวจสอบ</p>
                  <p className="text-sm text-stone-800 mt-1 leading-relaxed">{report.summary}</p>
                </div>
              </div>

              {/* Issues List */}
              {report.issues.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-medium">ยอดเยี่ยม! ไม่พบพล็อตโฮลหรือข้อขัดแย้งสำคัญในโครงเรื่องของคุณ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-600">
                    ประเด็นที่พบ ({report.issues.length} รายการ)
                  </h4>
                  {report.issues.map((issue, idx) => {
                    const st = severityStyle(issue.severity);
                    return (
                      <div key={idx} className={`rounded-2xl border p-4 space-y-2 ${st.border}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-stone-600 shrink-0" />
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.badge}`}>
                            {st.label}
                          </span>
                          <span className="text-xs font-bold text-stone-900">{issue.category}</span>
                          <span className="text-xs text-stone-500">• {issue.location}</span>
                        </div>
                        <p className="text-xs text-stone-800 leading-relaxed">{issue.description}</p>
                        <div className="pt-1.5 border-t border-stone-200/60 text-xs text-indigo-900">
                          <span className="font-bold">คำแนะนำ:</span> {issue.suggestion}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          {report ? (
            <button
              type="button"
              disabled={loading}
              onClick={runAudit}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              ตรวจซ้ำอีกครั้ง
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
