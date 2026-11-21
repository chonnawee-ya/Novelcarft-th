import { create } from 'zustand';
import {
  db,
  loadAISettings,
  loadApiKeysMap,
  saveAISettings,
  saveApiKeyForPreset,
} from '../db/database';
import { getPresetById } from '../data/aiProviders';
import {
  SCHEMA_VERSION,
  type AISettings,
  type AppView,
  type NovelProject,
  type ToastMessage,
  type WorkspaceTab,
} from '../types/novel';

interface AppState {
  // Navigation
  view: AppView;
  activeTab: WorkspaceTab;
  apiModalOpen: boolean;

  // Data
  projects: NovelProject[];
  activeProject: NovelProject | null;
  undoStack: NovelProject[];
  lastSavedAt: string | null;

  // AI & Settings
  apiKeysMap: Record<string, string>;
  apiKey: string;
  apiStatus: 'unknown' | 'connected' | 'error';
  aiSettings: AISettings;

  // Generation state
  isGenerating: boolean;
  generationLabel: string;
  abortController: AbortController | null;

  // Toasts
  toasts: ToastMessage[];

  // Helpers
  isAIConfigured: () => boolean;

  // Actions
  init: () => Promise<void>;
  setView: (view: AppView) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  setApiModalOpen: (open: boolean) => void;

  saveAIConfig: (settings: AISettings, keyForPreset: string) => void;
  clearApiKeyForPreset: (presetId: string) => void;
  setApiStatus: (status: 'unknown' | 'connected' | 'error') => void;

  openProject: (projectId: string) => Promise<void>;
  createAndOpenProject: (project: NovelProject) => Promise<void>;
  updateActiveProject: (updater: (prev: NovelProject) => NovelProject, recordUndo?: boolean) => Promise<void>;
  undoActiveProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<void>;
  importProjectBackup: (project: NovelProject) => Promise<void>;

  startGeneration: (label: string) => AbortController;
  updateGenerationLabel: (label: string) => void;
  endGeneration: () => void;
  cancelGeneration: () => void;

  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const MAX_UNDO_STEPS = 20;

const initialSettings = loadAISettings();
const initialKeysMap = loadApiKeysMap();
const initialKey = initialKeysMap[initialSettings.presetId] ?? '';
const initialPreset = getPresetById(initialSettings.presetId);
const initialReady = !initialPreset.requiresApiKey || Boolean(initialKey);

export const useAppStore = create<AppState>((set, get) => ({
  view: 'dashboard',
  activeTab: 'overview',
  apiModalOpen: false,

  projects: [],
  activeProject: null,
  undoStack: [],
  lastSavedAt: null,

  apiKeysMap: initialKeysMap,
  apiKey: initialKey,
  apiStatus: initialReady ? 'connected' : 'unknown',
  aiSettings: initialSettings,

  isGenerating: false,
  generationLabel: '',
  abortController: null,

  toasts: [],

  isAIConfigured: () => {
    const { aiSettings, apiKey } = get();
    const preset = getPresetById(aiSettings.presetId);
    if (!aiSettings.model.trim()) return false;
    return !preset.requiresApiKey || Boolean(apiKey.trim());
  },

  init: async () => {
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
    set({ projects: all });
  },

  setView: (view) => set({ view }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setApiModalOpen: (apiModalOpen) => set({ apiModalOpen }),

  saveAIConfig: (settings, keyForPreset) => {
    saveAISettings(settings);
    const nextMap = saveApiKeyForPreset(settings.presetId, keyForPreset);
    const activeKey = nextMap[settings.presetId] ?? '';
    const preset = getPresetById(settings.presetId);
    const ready = Boolean(settings.model.trim()) && (!preset.requiresApiKey || Boolean(activeKey));
    set({
      aiSettings: settings,
      apiKeysMap: nextMap,
      apiKey: activeKey,
      apiStatus: ready ? 'connected' : 'unknown',
    });
  },

  clearApiKeyForPreset: (presetId) => {
    const nextMap = saveApiKeyForPreset(presetId, '');
    const currentSettings = get().aiSettings;
    const activeKey = nextMap[currentSettings.presetId] ?? '';
    const preset = getPresetById(currentSettings.presetId);
    set({
      apiKeysMap: nextMap,
      apiKey: activeKey,
      apiStatus: !preset.requiresApiKey || Boolean(activeKey) ? 'connected' : 'unknown',
    });
  },

  setApiStatus: (apiStatus) => set({ apiStatus }),

  openProject: async (projectId) => {
    const proj = await db.projects.get(projectId);
    if (!proj) return;
    set({
      activeProject: proj,
      undoStack: [],
      view: 'workspace',
      activeTab: 'overview',
      lastSavedAt: proj.metadata.updatedAt,
    });
  },

  createAndOpenProject: async (project) => {
    await db.projects.put(project);
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
    set({
      projects: all,
      activeProject: project,
      undoStack: [],
      view: 'workspace',
      activeTab: 'overview',
      lastSavedAt: project.metadata.updatedAt,
    });
  },

  updateActiveProject: async (updater, recordUndo = true) => {
    const current = get().activeProject;
    if (!current) return;

    const now = new Date().toISOString();
    const updated = updater(structuredClone(current));
    updated.metadata.updatedAt = now;

    const nextUndo = recordUndo
      ? [...get().undoStack.slice(-(MAX_UNDO_STEPS - 1)), structuredClone(current)]
      : get().undoStack;

    await db.projects.put(updated);
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));

    set({
      activeProject: updated,
      projects: all,
      undoStack: nextUndo,
      lastSavedAt: now,
    });
  },

  undoActiveProject: async () => {
    const stack = get().undoStack;
    if (stack.length === 0) return;

    const previous = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    previous.metadata.updatedAt = new Date().toISOString();

    await db.projects.put(previous);
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));

    set({
      activeProject: previous,
      projects: all,
      undoStack: nextStack,
      lastSavedAt: previous.metadata.updatedAt,
    });
    get().addToast({ type: 'info', title: 'ย้อนกลับการแก้ไขล่าสุดแล้ว' });
  },

  deleteProject: async (projectId) => {
    await db.projects.delete(projectId);
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
    const active = get().activeProject;
    set({
      projects: all,
      activeProject: active?.projectId === projectId ? null : active,
      view: active?.projectId === projectId ? 'dashboard' : get().view,
    });
    get().addToast({ type: 'info', title: 'ลบโปรเจกต์เรียบร้อยแล้ว' });
  },

  duplicateProject: async (projectId) => {
    const orig = await db.projects.get(projectId);
    if (!orig) return;
    const now = new Date().toISOString();
    const copy: NovelProject = {
      ...structuredClone(orig),
      schemaVersion: SCHEMA_VERSION,
      projectId: crypto.randomUUID(),
      metadata: {
        ...orig.metadata,
        title: `${orig.metadata.title} (สำเนา)`,
        createdAt: now,
        updatedAt: now,
      },
    };
    await db.projects.put(copy);
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
    set({ projects: all });
    get().addToast({ type: 'success', title: 'ทำสำเนาโปรเจกต์เรียบร้อยแล้ว' });
  },

  importProjectBackup: async (project) => {
    const now = new Date().toISOString();
    const exists = await db.projects.get(project.projectId);
    const toSave: NovelProject = {
      ...project,
      schemaVersion: SCHEMA_VERSION,
      projectId: exists ? crypto.randomUUID() : project.projectId,
      metadata: {
        ...project.metadata,
        title: exists ? `${project.metadata.title} (นำเข้า)` : project.metadata.title,
        updatedAt: now,
      },
    };
    await db.projects.put(toSave);
    const all = await db.projects.toArray();
    all.sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt));
    set({ projects: all });
    get().addToast({
      type: 'success',
      title: 'นำเข้าโปรเจกต์สำเร็จ',
      description: `นำเข้า "${toSave.metadata.title}" เข้าคลังแล้ว`,
    });
  },

  startGeneration: (label) => {
    const prev = get().abortController;
    if (prev) prev.abort();
    const controller = new AbortController();
    set({ isGenerating: true, generationLabel: label, abortController: controller });
    return controller;
  },

  updateGenerationLabel: (generationLabel) => set({ generationLabel }),

  endGeneration: () => set({ isGenerating: false, generationLabel: '', abortController: null }),

  cancelGeneration: () => {
    const ctrl = get().abortController;
    if (ctrl) ctrl.abort();
    set({ isGenerating: false, generationLabel: '', abortController: null });
  },

  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
