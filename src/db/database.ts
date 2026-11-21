import Dexie, { type EntityTable } from 'dexie';
import { AI_PROVIDER_PRESETS } from '../data/aiProviders';
import type { AISettings, NovelProject } from '../types/novel';

class NovelOutlinerDB extends Dexie {
  projects!: EntityTable<NovelProject, 'projectId'>;

  constructor() {
    super('ThaiNovelOutlinerDB');
    this.version(1).stores({
      projects: 'projectId, metadata.title, metadata.updatedAt',
    });
  }
}

export const db = new NovelOutlinerDB();

const API_KEYS_MAP_STORAGE = 'plotcraft_th_api_keys_map';
const LEGACY_API_KEY_STORAGE = 'plotcraft_th_gemini_api_key';
const AI_SETTINGS_STORAGE = 'plotcraft_th_ai_settings_v2';

export function loadApiKeysMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(API_KEYS_MAP_STORAGE);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    // Migrate legacy single Gemini key if present
    const legacy = localStorage.getItem(LEGACY_API_KEY_STORAGE);
    if (legacy && !map.gemini) {
      map.gemini = legacy;
    }
    return map;
  } catch {
    return {};
  }
}

export function saveApiKeyForPreset(presetId: string, key: string): Record<string, string> {
  const map = loadApiKeysMap();
  if (key.trim()) {
    map[presetId] = key.trim();
  } else {
    delete map[presetId];
  }
  try {
    localStorage.setItem(API_KEYS_MAP_STORAGE, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
  return map;
}

export function loadApiKey(presetId?: string): string {
  const settings = loadAISettings();
  const targetPreset = presetId ?? settings.presetId;
  const map = loadApiKeysMap();
  return map[targetPreset] ?? '';
}

export function loadAISettings(): AISettings {
  const fallbackPreset = AI_PROVIDER_PRESETS[0]; // openrouter
  const defaults: AISettings = {
    provider: fallbackPreset.provider,
    presetId: fallbackPreset.id,
    baseUrl: fallbackPreset.baseUrl,
    model: fallbackPreset.defaultModel,
    temperature: 0.7,
  };

  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    const validProvider =
      parsed.provider === 'gemini' ||
      parsed.provider === 'openai-compatible' ||
      parsed.provider === 'anthropic'
        ? parsed.provider
        : defaults.provider;

    return {
      provider: validProvider,
      presetId: typeof parsed.presetId === 'string' && parsed.presetId ? parsed.presetId : defaults.presetId,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : defaults.baseUrl,
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : defaults.model,
      temperature:
        typeof parsed.temperature === 'number' && parsed.temperature >= 0 && parsed.temperature <= 1.5
          ? parsed.temperature
          : 0.7,
      useCorsProxy: Boolean(parsed.useCorsProxy),
    };
  } catch {
    return defaults;
  }
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
