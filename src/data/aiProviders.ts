import type { AIProviderType } from '../types/novel';

export interface AIProviderPreset {
  id: string;
  name: string;
  badge?: string;
  provider: AIProviderType;
  baseUrl: string;
  defaultModel: string;
  suggestedModels: string[];
  requiresApiKey: boolean;
  keyPlaceholder: string;
  keyGuideUrl?: string;
  keyGuideLabel?: string;
  description: string;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (รวมทุกค่าย)',
    badge: 'แนะนำ',
    provider: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash-preview',
    suggestedModels: [
      'google/gemini-2.5-flash-preview',
      'anthropic/claude-3.7-sonnet',
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat-v3-0324',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-or-v1-...',
    keyGuideUrl: 'https://openrouter.ai/keys',
    keyGuideLabel: 'ขอคีย์ที่ OpenRouter',
    description: 'ใช้คีย์เดียวสลับได้ทั้ง Gemini, Claude, GPT, DeepSeek, Llama รองรับการเรียกจากเบราว์เซอร์ 100%',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
    ],
    requiresApiKey: true,
    keyPlaceholder: 'AIzaSy...',
    keyGuideUrl: 'https://aistudio.google.com/apikey',
    keyGuideLabel: 'ขอคีย์ที่ Google AI Studio',
    description: 'เชื่อมต่อตรงกับ Google Gemini API กด "ดึงรายชื่อโมเดล" เพื่อดูรุ่นล่าสุดที่ใช้ได้กับคีย์ของคุณ',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    requiresApiKey: true,
    keyPlaceholder: 'sk-proj-...',
    keyGuideUrl: 'https://platform.openai.com/api-keys',
    keyGuideLabel: 'ขอคีย์ที่ OpenAI Platform',
    description: 'ใช้โมเดลตระกูล GPT-4o / GPT-4.1 โดยตรง',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-7-sonnet-latest',
    suggestedModels: [
      'claude-3-7-sonnet-latest',
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-ant-...',
    keyGuideUrl: 'https://console.anthropic.com/settings/keys',
    keyGuideLabel: 'ขอคีย์ที่ Anthropic Console',
    description: 'เด่นมากเรื่องภาษาไทย สำนวนวรรณกรรม และการวางพล็อตนิยาย',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
    keyPlaceholder: 'sk-...',
    keyGuideUrl: 'https://platform.deepseek.com/api_keys',
    keyGuideLabel: 'ขอคีย์ที่ DeepSeek',
    description: 'ราคาประหยัดมากและเขียนภาษาไทยได้ดี',
  },
  {
    id: 'groq',
    name: 'Groq (ความเร็วสูง)',
    provider: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: ['llama-3.3-70b-versatile', 'qwen-qwq-32b'],
    requiresApiKey: true,
    keyPlaceholder: 'gsk_...',
    keyGuideUrl: 'https://console.groq.com/keys',
    keyGuideLabel: 'ขอคีย์ฟรีที่ Groq',
    description: 'ประมวลผลเร็วมาก มีโควต้าฟรีให้ทดลองใช้งาน',
  },
  {
    id: 'typhoon',
    name: 'Typhoon (SCB 10X ไทย)',
    provider: 'openai-compatible',
    baseUrl: 'https://api.opentyphoon.ai/v1',
    defaultModel: 'typhoon-v2-70b-instruct',
    suggestedModels: ['typhoon-v2-70b-instruct', 'typhoon-v2.1-12b-instruct'],
    requiresApiKey: true,
    keyPlaceholder: 'sk-...',
    keyGuideUrl: 'https://opentyphoon.ai/',
    keyGuideLabel: 'ขอคีย์ที่ OpenTyphoon',
    description: 'โมเดล AI สัญชาติไทยที่เทรนมาเฉพาะสำหรับภาษาไทย',
  },
  {
    id: 'ollama',
    name: 'Ollama / LM Studio (Local)',
    badge: 'ฟรี / Offline',
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:14b',
    suggestedModels: ['qwen2.5:14b', 'gemma3:12b', 'llama3.2', 'typhoon2-llama3.2'],
    requiresApiKey: false,
    keyPlaceholder: '(ไม่ต้องใส่คีย์สำหรับ Local AI)',
    description: 'รันบนเครื่องตัวเอง ไม่เสียค่า API และเป็นส่วนตัว 100%',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI API',
    provider: 'openai-compatible',
    baseUrl: 'https://api.example.com/v1',
    defaultModel: '',
    suggestedModels: [],
    requiresApiKey: true,
    keyPlaceholder: 'กรอก API Key (ถ้ามี)',
    description: 'เชื่อมต่อกับผู้ให้บริการใดก็ได้ที่รองรับมาตรฐาน OpenAI Chat Completions',
  },
];

export function getPresetById(id: string): AIProviderPreset {
  return AI_PROVIDER_PRESETS.find((p) => p.id === id) ?? AI_PROVIDER_PRESETS[0];
}
