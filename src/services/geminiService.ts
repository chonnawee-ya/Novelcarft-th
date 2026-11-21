import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type, type Schema } from '@google/genai';
import { getStructureById } from '../data/knowledgeBase';
import { getPresetById } from '../data/aiProviders';
import {
  ChapterBatchResponseSchema,
  ChapterBeatSchema,
  MacroOutlineResponseSchema,
  type AISettings,
  type ChapterBeat,
  type CharacterItem,
  type NovelProject,
  type PlotBeat,
  type WorldBuildingItem,
} from '../types/novel';
import { z } from 'zod';

const BASE_SYSTEM_INSTRUCTION = `คุณคือ "บรรณาธิการและนักวางโครงสร้างนิยายภาษาไทยมืออาชีพ" (Master Thai Fiction Editor & Story Architect)
งานของคุณคือช่วยวางโครงสร้างนิยายสมมติ (Creative Fiction Outlining) ให้มีคุณภาพระดับตีพิมพ์

กฎเหล็กที่ต้องปฏิบัติตามอย่างเคร่งครัด:
1. ตอบกลับเป็น JSON ที่ถูกต้องตามโครงสร้างที่กำหนดเท่านั้น ห้ามใส่คำทักทาย คำอธิบายนอก JSON หรือข้อความส่วนเกิน
2. ห้ามปล่อยฟิลด์บังคับเป็นค่าว่าง หรือใส่คำว่า "TBD" / "รอเพิ่มเติม" ทุกฟิลด์ต้องมีเนื้อหาจริงและนำไปเขียนนิยายต่อได้ทันที
3. ใช้ภาษาไทยที่สละสลวย เป็นธรรมชาติสำหรับงานวรรณกรรม ห้ามใช้สำนวนแปลตรงตัวจากภาษาอังกฤษ (Translationese)
4. ตั้งชื่อตัวละคร สถานที่ ระดับภาษา และอารมณ์เรื่องให้สอดคล้องกับแนวนิยาย (Genres) และโทนเรื่อง (Tone) ที่กำหนด
5. เขียนในรูปแบบ "โครงเรื่องที่กระชับ ชัดเจน เห็นภาพการกระทำและปมขัดแย้ง" ห้ามเขียนบทสนทนายาวๆ หรือบรรยายเนื้อหานิยายเต็มตอน
6. ข้อมูลโลก (World-Building) และตัวละครที่ถูกปักหมุด (Pinned Lore/Canon) ถือเป็นความจริงสูงสุด ห้ามละเมิดหรือขัดแย้งโดยเด็ดขาด
7. เมื่อสร้างตอนต่อจากเดิม ต้องเชื่อมโยงต่อจาก Rolling Summary และจุดทิ้งท้าย (Cliffhanger) ของตอนก่อนหน้าอย่างสมเหตุสมผล และคุมจังหวะเรื่อง (Pacing) ให้พอดีกับจำนวนตอนเป้าหมาย ห้ามเร่งจบก่อนกำหนด`;

const FICTION_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export class AIServiceError extends Error {
  code: 'AUTH' | 'RATE_LIMIT' | 'SAFETY' | 'MAX_TOKENS' | 'ABORTED' | 'VALIDATION' | 'NETWORK' | 'UNKNOWN';

  constructor(message: string, code: AIServiceError['code'] = 'UNKNOWN') {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AIServiceError('ยกเลิกการทำงานแล้ว', 'ABORTED'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new AIServiceError('ยกเลิกการทำงานแล้ว', 'ABORTED'));
      },
      { once: true }
    );
  });
}

function classifyError(err: unknown): AIServiceError {
  if (err instanceof AIServiceError) return err;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new AIServiceError('ยกเลิกการทำงานแล้ว', 'ABORTED');
  }
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('abort')) {
    return new AIServiceError('ยกเลิกการทำงานแล้ว', 'ABORTED');
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('api key') || lower.includes('api_key_invalid') || lower.includes('unauthorized')) {
    return new AIServiceError('API Key ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้งาน กรุณาตรวจสอบ API Key และชื่อโมเดลอีกครั้ง', 'AUTH');
  }
  if (lower.includes('404') || lower.includes('not found') || lower.includes('does not exist')) {
    return new AIServiceError(
      `ไม่พบโมเดลหรือ Endpoint ที่ระบุ (${msg}) ลองกด "ดึงรายชื่อโมเดล" หรือเปลี่ยนชื่อโมเดลในหน้าตั้งค่า AI`,
      'AUTH'
    );
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('rate limit') || lower.includes('quota')) {
    return new AIServiceError('ใช้งานเกินขีดจำกัดความเร็วชั่วคราว (429 Rate Limit) กรุณารอสักครู่แล้วลองใหม่', 'RATE_LIMIT');
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('overloaded')) {
    return new AIServiceError('เซิร์ฟเวอร์ AI กำลังทำงานหนัก (503) กรุณาลองใหม่อีกครั้ง', 'RATE_LIMIT');
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('cors')) {
    return new AIServiceError(
      'ไม่สามารถเชื่อมต่อ API ได้ (อาจเกิดจากอินเทอร์เน็ต, Base URL ไม่ถูกต้อง, หรือผู้ให้บริการนี้บล็อก CORS จากเบราว์เซอร์ — แนะนำใช้ OpenRouter หรือ Google Gemini ซึ่งรองรับเบราว์เซอร์โดยตรง)',
      'NETWORK'
    );
  }
  return new AIServiceError(msg || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุจาก AI API', 'UNKNOWN');
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  // Strip ```json ... ``` fences if model wrapped it
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  // Find outermost JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

async function apiFetch(
  targetUrl: string,
  init: RequestInit,
  useCorsProxy?: boolean
): Promise<Response> {
  if (!useCorsProxy) {
    return fetch(targetUrl, init);
  }
  const headers = new Headers(init.headers);
  headers.set('X-Target-URL', targetUrl);
  return fetch('/api/cors-proxy', {
    ...init,
    headers,
  });
}

function validateConfig(apiKey: string, settings: AISettings) {
  const preset = getPresetById(settings.presetId);
  if (preset.requiresApiKey && !apiKey.trim()) {
    throw new AIServiceError(`กรุณาตั้งค่า API Key สำหรับ ${preset.name} ก่อนใช้งาน`, 'AUTH');
  }
  if (!settings.model.trim()) {
    throw new AIServiceError('กรุณาระบุชื่อโมเดล (Model ID) ในหน้าตั้งค่า AI', 'AUTH');
  }
  if (settings.provider !== 'gemini' && !settings.baseUrl.trim()) {
    throw new AIServiceError('กรุณาระบุ Base URL ในหน้าตั้งค่า AI', 'AUTH');
  }
}

async function callGeminiProvider(params: {
  apiKey: string;
  settings: AISettings;
  prompt: string;
  schema: Schema;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, settings, prompt, schema, signal } = params;
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const response = await ai.models.generateContent({
    model: settings.model.trim(),
    contents: prompt,
    config: {
      systemInstruction: BASE_SYSTEM_INSTRUCTION,
      temperature: settings.temperature,
      responseMimeType: 'application/json',
      responseSchema: schema,
      safetySettings: FICTION_SAFETY_SETTINGS,
      abortSignal: signal,
    },
  });

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'BLOCKLIST') {
    throw new AIServiceError(
      'เนื้อหาบางส่วนถูกระบบความปลอดภัยของ Gemini กรองไว้ ลองปรับคำบรรยายไอเดียให้ลดความรุนแรงลงเล็กน้อยแล้วลองใหม่ครับ',
      'SAFETY'
    );
  }
  if (finishReason === 'MAX_TOKENS') {
    throw new AIServiceError('ผลลัพธ์ยาวเกินขีดจำกัดโทเคนจน JSON ถูกตัดจบ กรุณาลองใหม่อีกครั้ง', 'MAX_TOKENS');
  }
  if (!response.text) {
    throw new AIServiceError('AI ไม่ได้ส่งข้อความกลับมา กรุณาลองใหม่อีกครั้ง', 'VALIDATION');
  }
  return response.text;
}

async function callOpenAICompatibleProvider(params: {
  apiKey: string;
  settings: AISettings;
  prompt: string;
  jsonContract: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, settings, prompt, jsonContract, signal } = params;
  const url = `${normalizeBaseUrl(settings.baseUrl)}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }
  if (settings.baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'PlotCraft TH Novel Outliner';
  }

  const fullPrompt = `${prompt}\n\n[รูปแบบ JSON ที่บังคับ — ตอบเป็น JSON Object เพียงอย่างเดียว ห้ามมีข้อความอื่นนอก JSON]:\n${jsonContract}`;

  const doRequest = async (useResponseFormat: boolean) => {
    const body: Record<string, unknown> = {
      model: settings.model.trim(),
      temperature: settings.temperature,
      messages: [
        { role: 'system', content: BASE_SYSTEM_INSTRUCTION },
        { role: 'user', content: fullPrompt },
      ],
    };
    if (useResponseFormat) {
      body.response_format = { type: 'json_object' };
    }

    const res = await apiFetch(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      },
      settings.useCorsProxy
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // Some providers / models reject response_format with 400 -> fallback without it
      if (useResponseFormat && res.status === 400 && errText.toLowerCase().includes('response_format')) {
        return doRequest(false);
      }
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const choice = data?.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new AIServiceError('ผลลัพธ์ยาวเกินขีดจำกัดโทเคนจน JSON ถูกตัดจบ กรุณาลองใหม่อีกครั้ง', 'MAX_TOKENS');
    }
    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIServiceError('AI ไม่ได้ส่งข้อความกลับมา กรุณาลองใหม่อีกครั้ง', 'VALIDATION');
    }
    return content;
  };

  return doRequest(true);
}

async function callAnthropicProvider(params: {
  apiKey: string;
  settings: AISettings;
  prompt: string;
  jsonContract: string;
  signal?: AbortSignal;
}): Promise<string> {
  const { apiKey, settings, prompt, jsonContract, signal } = params;
  const url = `${normalizeBaseUrl(settings.baseUrl)}/messages`;

  const fullPrompt = `${prompt}\n\n[รูปแบบ JSON ที่บังคับ — ตอบเป็น JSON Object เพียงอย่างเดียว ห้ามมีข้อความอื่นนอก JSON]:\n${jsonContract}`;

  const res = await apiFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model.trim(),
        max_tokens: 8192,
        temperature: Math.min(1, settings.temperature),
        system: BASE_SYSTEM_INSTRUCTION,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
      signal,
    },
    settings.useCorsProxy
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data?.stop_reason === 'max_tokens') {
    throw new AIServiceError('ผลลัพธ์ยาวเกินขีดจำกัดโทเคนจน JSON ถูกตัดจบ กรุณาลองใหม่อีกครั้ง', 'MAX_TOKENS');
  }
  const textBlock = Array.isArray(data?.content)
    ? data.content.find((b: { type?: string }) => b.type === 'text')
    : null;
  if (!textBlock?.text) {
    throw new AIServiceError('Claude ไม่ได้ส่งข้อความกลับมา กรุณาลองใหม่อีกครั้ง', 'VALIDATION');
  }
  return textBlock.text;
}

async function generateStructuredJson<T>(params: {
  apiKey: string;
  settings: AISettings;
  prompt: string;
  schema: Schema;
  jsonContract: string;
  validator: z.ZodType<T, z.ZodTypeDef, unknown>;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}): Promise<T> {
  const { apiKey, settings, prompt, schema, jsonContract, validator, signal, onRetry } = params;
  validateConfig(apiKey, settings);

  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new AIServiceError('ยกเลิกการทำงานแล้ว', 'ABORTED');
    }

    try {
      let rawText: string;
      if (settings.provider === 'gemini') {
        rawText = await callGeminiProvider({ apiKey, settings, prompt, schema, signal });
      } else if (settings.provider === 'anthropic') {
        rawText = await callAnthropicProvider({ apiKey, settings, prompt, jsonContract, signal });
      } else {
        rawText = await callOpenAICompatibleProvider({ apiKey, settings, prompt, jsonContract, signal });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJsonText(rawText));
      } catch {
        throw new AIServiceError('ไม่สามารถแปลงผลลัพธ์ JSON จาก AI ได้', 'VALIDATION');
      }

      const validated = validator.safeParse(parsed);
      if (!validated.success) {
        throw new AIServiceError(
          `โครงสร้างข้อมูลจาก AI ไม่ครบถ้วนตามสเปก (${validated.error.issues[0]?.message ?? 'Validation failed'})`,
          'VALIDATION'
        );
      }

      return validated.data;
    } catch (err) {
      const classified = classifyError(err);
      if (classified.code === 'ABORTED' || classified.code === 'AUTH' || classified.code === 'SAFETY') {
        throw classified;
      }

      const isRetryable =
        classified.code === 'RATE_LIMIT' ||
        classified.code === 'VALIDATION';

      if (isRetryable && attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt + 1) * 1000;
        onRetry?.(attempt + 1, waitMs);
        await sleep(waitMs, signal);
        continue;
      }

      throw classified;
    }
  }

  throw new AIServiceError('ไม่สามารถเชื่อมต่อ AI API ได้หลังจากลองใหม่หลายครั้ง', 'UNKNOWN');
}

export async function testAIConnection(
  apiKey: string,
  settings: AISettings
): Promise<{ ok: boolean; message: string }> {
  try {
    validateConfig(apiKey, settings);

    if (settings.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const res = await ai.models.generateContent({
        model: settings.model.trim(),
        contents: 'ตอบคำว่า OK สั้นๆ คำเดียว',
      });
      if (res.text) {
        return { ok: true, message: `เชื่อมต่อ Gemini (${settings.model}) สำเร็จพร้อมใช้งาน!` };
      }
      return { ok: false, message: 'เชื่อมต่อได้แต่ไม่ได้รับข้อความตอบกลับ' };
    }

    if (settings.provider === 'anthropic') {
      const res = await apiFetch(
        `${normalizeBaseUrl(settings.baseUrl)}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim(),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: settings.model.trim(),
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Reply OK' }],
          }),
        },
        settings.useCorsProxy
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      return { ok: true, message: `เชื่อมต่อ Claude (${settings.model}) สำเร็จพร้อมใช้งาน!` };
    }

    // OpenAI-compatible
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    if (settings.baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'PlotCraft TH Novel Outliner';
    }

    const res = await apiFetch(
      `${normalizeBaseUrl(settings.baseUrl)}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: settings.model.trim(),
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Reply OK' }],
        }),
      },
      settings.useCorsProxy
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    return { ok: true, message: `เชื่อมต่อ ${settings.model} สำเร็จพร้อมใช้งาน!` };
  } catch (err) {
    const classified = classifyError(err);
    return { ok: false, message: classified.message };
  }
}

export async function fetchAvailableModels(
  apiKey: string,
  settings: AISettings
): Promise<string[]> {
  if (settings.provider === 'gemini') {
    if (!apiKey.trim()) throw new AIServiceError('กรุณากรอก Gemini API Key ก่อนดึงรายชื่อโมเดล', 'AUTH');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const models: string[] = (data?.models ?? [])
      .filter(
        (m: { supportedGenerationMethods?: string[]; name?: string }) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          m.name?.includes('gemini')
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ''));
    return models.sort().reverse();
  }

  if (settings.provider === 'anthropic') {
    return getPresetById('anthropic').suggestedModels;
  }

  // OpenAI-compatible GET /models
  const headers: Record<string, string> = {};
  if (apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  const res = await apiFetch(
    `${normalizeBaseUrl(settings.baseUrl)}/models`,
    { headers },
    settings.useCorsProxy
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const list: string[] = (data?.data ?? [])
    .map((m: { id?: string }) => m.id)
    .filter((id: unknown): id is string => typeof id === 'string');
  return list.slice(0, 150);
}

export interface MacroOutlineInput {
  mode: 'scratch' | 'import';
  title: string;
  genres: string[];
  structureTemplateId: string;
  tone: string;
  targetAudience: string;
  targetChapterCount: number;
  seedIdea: string;
}

export async function generateMacroOutline(params: {
  apiKey: string;
  settings: AISettings;
  input: MacroOutlineInput;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}) {
  const { apiKey, settings, input, signal, onRetry } = params;
  const template = getStructureById(input.structureTemplateId);

  const beatsSpecList = template.beats
    .map((b, i) => `${i + 1}. [${b.act}] ${b.beatName} — ${b.hint}`)
    .join('\n');

  const modeInstruction =
    input.mode === 'import'
      ? `โหมดนำเข้าโน้ตเดิมของผู้ใช้ (Import Draft):
- วิเคราะห์โน้ตต้นฉบับด้านล่าง แล้วสกัดข้อมูลจัดลงโครงสร้าง JSON โดยยึดแก่นเรื่อง ชื่อตัวละคร และปมเดิมของผู้ใช้เป็นหลัก ห้ามเปลี่ยนแก่นเรื่องเดิม
- เติมเต็มเฉพาะช่องว่างที่จำเป็นให้โครงเรื่องสมบูรณ์ตามทฤษฎีที่เลือก`
      : `โหมดสร้างจากไอเดียตั้งต้น (Create from Scratch):
- ขยายไอเดียตั้งต้นของผู้ใช้ให้กลายเป็นโครงสร้างนิยายที่สมบูรณ์ น่าติดตาม และมีเอกลักษณ์`;

  const prompt = `${modeInstruction}

ข้อมูลโปรเจกต์:
- ชื่อเรื่องที่ผู้ใช้ตั้งไว้: ${input.title.trim() || '(ยังไม่ได้ตั้ง กรุณาคิดชื่อเรื่องภาษาไทยที่ดึงดูดให้ใน suggestedTitle)'}
- แนวนิยาย: ${input.genres.join(', ')}
- ทฤษฎีโครงสร้างการเล่าเรื่อง: ${template.name} (${template.nameTh})
- โทนเรื่อง: ${input.tone}
- กลุ่มเป้าหมาย: ${input.targetAudience}
- จำนวนตอนเป้าหมาย: ${input.targetChapterCount} ตอน

ไอเดียตั้งต้น / โน้ตของผู้ใช้:
"""
${input.seedIdea.trim()}
"""

ข้อกำหนดผลลัพธ์:
1. worldBuilding: สร้างกฎของโลก สถานที่ หรือระบบสำคัญ 3-5 รายการที่ชัดเจนและใช้ต่อได้จริง
2. characters: สร้างตัวละครหลัก 3-5 ตัว (รวมตัวเอกและคู่ขัดแย้ง/ตัวละครสำคัญ) พร้อมเป้าหมาย จุดอ่อน ภูมิหลัง และความสัมพันธ์ระหว่างตัวละคร
3. plotBeats: ต้องสร้างครบทั้ง ${template.beatCount} จังหวะตามลำดับของ "${template.name}" เป๊ะๆ ดังนี้:
${beatsSpecList}`;

  const jsonContract = `{
  "suggestedTitle": "ชื่อเรื่องภาษาไทย",
  "logline": "ประโยคสรุปแก่นเรื่องและปมขัดแย้งหลัก 1-2 ประโยค",
  "worldBuilding": [
    { "category": "หมวดหมู่", "detail": "รายละเอียด" }
  ],
  "characters": [
    {
      "name": "ชื่อตัวละคร",
      "role": "บทบาท",
      "archetype": "บทบาทตามทฤษฎี",
      "goal": "เป้าหมายหลัก",
      "flaw": "จุดอ่อนหรือปมในใจ",
      "background": "ภูมิหลังย่อ",
      "relationships": "ความสัมพันธ์กับตัวละครอื่น"
    }
  ],
  "plotBeats": [
    { "beatName": "ชื่อจังหวะ", "act": "องก์", "summary": "สรุปเหตุการณ์" }
  ]
}`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      suggestedTitle: { type: Type.STRING },
      logline: { type: Type.STRING },
      worldBuilding: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            detail: { type: Type.STRING },
          },
          required: ['category', 'detail'],
        },
      },
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            archetype: { type: Type.STRING },
            goal: { type: Type.STRING },
            flaw: { type: Type.STRING },
            background: { type: Type.STRING },
            relationships: { type: Type.STRING },
          },
          required: ['name', 'role', 'archetype', 'goal', 'flaw', 'background', 'relationships'],
        },
      },
      plotBeats: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            beatName: { type: Type.STRING },
            act: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ['beatName', 'act', 'summary'],
        },
      },
    },
    required: ['suggestedTitle', 'logline', 'worldBuilding', 'characters', 'plotBeats'],
  };

  return generateStructuredJson({
    apiKey,
    settings,
    prompt,
    schema,
    jsonContract,
    validator: MacroOutlineResponseSchema,
    signal,
    onRetry,
  });
}

function buildPinnedContextBlock(project: NovelProject): string {
  const pinnedWorld = project.macroOutline.worldBuilding.filter((w) => w.isPinned);
  const pinnedChars = project.macroOutline.characters.filter((c) => c.isPinned);

  const worldText =
    pinnedWorld.length > 0
      ? pinnedWorld.map((w) => `- [${w.category}]: ${w.detail}`).join('\n')
      : '(ไม่มีรายการปักหมุด ใช้ข้อมูลโลกโดยรวมตามโครงเรื่อง)';

  const charText =
    pinnedChars.length > 0
      ? pinnedChars
          .map(
            (c) =>
              `- ${c.name} (${c.role}${c.archetype ? ` / ${c.archetype}` : ''}): เป้าหมาย=${c.goal} | ปม=${c.flaw} | ภูมิหลัง=${c.background}${c.relationships ? ` | ความสัมพันธ์=${c.relationships}` : ''}`
          )
          .join('\n')
      : '(ไม่มีตัวละครปักหมุด)';

  const beatsText = project.macroOutline.plotBeats
    .map((b, idx) => `${idx + 1}. [${b.act}] ${b.beatName}: ${b.summary}`)
    .join('\n');

  return `ข้อมูลหลักของเรื่อง:
- ชื่อเรื่อง: ${project.metadata.title}
- แนวนิยาย: ${project.metadata.genres.join(', ')}
- โทนเรื่อง: ${project.metadata.tone}
- กลุ่มเป้าหมาย: ${project.metadata.targetAudience}
- ทฤษฎีโครงเรื่อง: ${project.metadata.structureTemplate}
- จำนวนตอนเป้าหมายทั้งหมด: ${project.metadata.targetChapterCount} ตอน
- Logline: ${project.macroOutline.logline}

[PINNED LORE / กฎของโลกที่ห้ามขัดแย้ง]:
${worldText}

[PINNED CHARACTERS / ตัวละครสำคัญที่ห้ามขัดแย้ง]:
${charText}

[MACRO PLOT BEATS / แผนที่โครงเรื่องหลัก]:
${beatsText}`;
}

export async function generateChapterBatch(params: {
  apiKey: string;
  settings: AISettings;
  project: NovelProject;
  batchSize?: number;
  steeringPrompt?: string;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}) {
  const { apiKey, settings, project, batchSize = 5, steeringPrompt, signal, onRetry } = params;
  const startChapter = project.chapters.length + 1;
  const remaining = Math.max(1, project.metadata.targetChapterCount - project.chapters.length);
  const count = Math.min(batchSize, remaining);
  const endChapter = startChapter + count - 1;

  const lastChapter = project.chapters[project.chapters.length - 1];
  const continuityBlock = lastChapter
    ? `สรุปเหตุการณ์สะสมล่าสุด (Rolling Summary):
${project.rollingSummary || '(ยังไม่มีสรุปสะสม)'}

ตอนล่าสุดก่อนหน้า (ตอนที่ ${lastChapter.chapterNumber}: ${lastChapter.title}):
- สรุปตอน: ${lastChapter.summary}
- จุดทิ้งท้าย (Cliffhanger): ${lastChapter.cliffhanger}`
    : 'นี่คือชุดตอนเริ่มต้น (ตอนที่ 1) ให้เปิดเรื่องอย่างทรงพลัง ดึงดูดผู้อ่านทันทีตามโครงเรื่องหลัก';

  const prompt = `${buildPinnedContextBlock(project)}

${continuityBlock}

คำสั่ง:
สร้างโครงสร้างรายตอนตั้งแต่ **ตอนที่ ${startChapter} ถึง ตอนที่ ${endChapter}** (รวม ${count} ตอนพอดี)
- คุมจังหวะเรื่อง (Pacing) ให้เหมาะสมกับสัดส่วนตอนปัจจุบันเทียบกับเป้าหมายทั้งหมด ${project.metadata.targetChapterCount} ตอน
- ระบุ linkedBeat ว่าแต่ละตอนกำลังดำเนินอยู่ในจังหวะใดของ Macro Plot Beats
- ห้ามเร่งจบเรื่องก่อนถึงตอนที่ ${project.metadata.targetChapterCount} (ยกเว้นถ้าตอนที่ ${endChapter} คือตอนสุดท้าย)
- สร้าง updatedRollingSummary เพื่อสรุปเหตุการณ์สำคัญสะสมทั้งหมดตั้งแต่ตอนที่ 1 จนถึงตอนที่ ${endChapter} อย่างกระชับสำหรับใช้เป็นบริบทในชุดถัดไป
${steeringPrompt?.trim() ? `\nคำสั่งเพิ่มเติมจากนักเขียน (ต้องทำตาม): ${steeringPrompt.trim()}` : ''}`;

  const jsonContract = `{
  "chapters": [
    {
      "chapterNumber": ${startChapter},
      "title": "ชื่อตอน",
      "linkedBeat": "ชื่อจังหวะจากโครงเรื่องหลัก",
      "goal": "เป้าหมายในตอน",
      "conflict": "อุปสรรค/ความขัดแย้ง",
      "outcome": "ผลลัพธ์ของเหตุการณ์",
      "cliffhanger": "จุดทิ้งท้ายชวนติดตาม",
      "summary": "สรุปเหตุการณ์ย่อ 2-4 ประโยค"
    }
  ],
  "updatedRollingSummary": "สรุปเหตุการณ์สะสมตั้งแต่ตอนที่ 1 ถึงตอนที่ ${endChapter}"
}`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      chapters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            chapterNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            linkedBeat: { type: Type.STRING },
            goal: { type: Type.STRING },
            conflict: { type: Type.STRING },
            outcome: { type: Type.STRING },
            cliffhanger: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ['chapterNumber', 'title', 'linkedBeat', 'goal', 'conflict', 'outcome', 'cliffhanger', 'summary'],
        },
      },
      updatedRollingSummary: { type: Type.STRING },
    },
    required: ['chapters', 'updatedRollingSummary'],
  };

  return generateStructuredJson({
    apiKey,
    settings,
    prompt,
    schema,
    jsonContract,
    validator: ChapterBatchResponseSchema,
    signal,
    onRetry,
  });
}

export async function regenerateSingleChapter(params: {
  apiKey: string;
  settings: AISettings;
  project: NovelProject;
  chapterIndex: number;
  steeringPrompt?: string;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}): Promise<ChapterBeat> {
  const { apiKey, settings, project, chapterIndex, steeringPrompt, signal, onRetry } = params;
  const target = project.chapters[chapterIndex];
  const prev = chapterIndex > 0 ? project.chapters[chapterIndex - 1] : null;
  const next = chapterIndex < project.chapters.length - 1 ? project.chapters[chapterIndex + 1] : null;

  const prompt = `${buildPinnedContextBlock(project)}

คำสั่ง: สร้างโครงสร้างใหม่เฉพาะ **ตอนที่ ${target.chapterNumber}** เท่านั้น
- ต้องเชื่อมโยงต่อจากตอนก่อนหน้าและส่งต่อไปยังตอนถัดไปได้อย่างแนบเนียน (หากมี)
- ห้ามขัดแย้งกับข้อมูลปักหมุด

ตอนก่อนหน้า: ${prev ? `ตอนที่ ${prev.chapterNumber} (${prev.title}) — สรุป: ${prev.summary} | Cliffhanger: ${prev.cliffhanger}` : '(ไม่มี — นี่คือตอนแรก)'}
ตอนเดิมที่ต้องการปรับปรุง: ตอนที่ ${target.chapterNumber} (${target.title}) — สรุปเดิม: ${target.summary}
ตอนถัดไป: ${next ? `ตอนที่ ${next.chapterNumber} (${next.title}) — เป้าหมาย: ${next.goal} | สรุป: ${next.summary}` : '(ยังไม่มีตอนถัดไป)'}
${steeringPrompt?.trim() ? `\nความต้องการเฉพาะของนักเขียนสำหรับตอนนี้: ${steeringPrompt.trim()}` : '\nให้นำเสนอทางเลือกใหม่ที่เข้มข้นและน่าติดตามยิ่งขึ้นกว่าฉบับเดิม'}`;

  const jsonContract = `{
  "chapterNumber": ${target.chapterNumber},
  "title": "ชื่อตอน",
  "linkedBeat": "ชื่อจังหวะ",
  "goal": "เป้าหมาย",
  "conflict": "ความขัดแย้ง",
  "outcome": "ผลลัพธ์",
  "cliffhanger": "จุดทิ้งท้าย",
  "summary": "สรุปย่อ"
}`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      chapterNumber: { type: Type.INTEGER },
      title: { type: Type.STRING },
      linkedBeat: { type: Type.STRING },
      goal: { type: Type.STRING },
      conflict: { type: Type.STRING },
      outcome: { type: Type.STRING },
      cliffhanger: { type: Type.STRING },
      summary: { type: Type.STRING },
    },
    required: ['chapterNumber', 'title', 'linkedBeat', 'goal', 'conflict', 'outcome', 'cliffhanger', 'summary'],
  };

  const result = await generateStructuredJson({
    apiKey,
    settings,
    prompt,
    schema,
    jsonContract,
    validator: ChapterBeatSchema,
    signal,
    onRetry,
  });

  return { ...result, chapterNumber: target.chapterNumber };
}

export async function generateNewCharacter(params: {
  apiKey: string;
  settings: AISettings;
  project: NovelProject;
  steeringPrompt?: string;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}): Promise<Omit<CharacterItem, 'id' | 'isPinned'>> {
  const { apiKey, settings, project, steeringPrompt, signal, onRetry } = params;
  const existingNames = project.macroOutline.characters.map((c) => `${c.name} (${c.role})`).join(', ');

  const prompt = `${buildPinnedContextBlock(project)}

ตัวละครที่มีอยู่แล้ว: ${existingNames}

คำสั่ง: ออกแบบตัวละครใหม่เพิ่ม 1 ตัว ที่ช่วยเสริมมิติ ความขัดแย้ง หรือเส้นเรื่องรองให้เรื่องนี้น่าสนใจขึ้น ห้ามตั้งชื่อซ้ำกับตัวละครเดิม
${steeringPrompt?.trim() ? `ความต้องการเพิ่มเติมจากนักเขียน: ${steeringPrompt.trim()}` : ''}`;

  const jsonContract = `{
  "name": "ชื่อตัวละคร",
  "role": "บทบาท",
  "archetype": "บทบาทตามทฤษฎี",
  "goal": "เป้าหมายหลัก",
  "flaw": "จุดอ่อน/ปมในใจ",
  "background": "ภูมิหลังย่อ",
  "relationships": "ความสัมพันธ์กับตัวละครอื่น"
}`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      role: { type: Type.STRING },
      archetype: { type: Type.STRING },
      goal: { type: Type.STRING },
      flaw: { type: Type.STRING },
      background: { type: Type.STRING },
      relationships: { type: Type.STRING },
    },
    required: ['name', 'role', 'archetype', 'goal', 'flaw', 'background', 'relationships'],
  };

  const validator = z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    archetype: z.string().default(''),
    goal: z.string().min(1),
    flaw: z.string().min(1),
    background: z.string().min(1),
    relationships: z.string().default(''),
  });

  return generateStructuredJson({ apiKey, settings, prompt, schema, jsonContract, validator, signal, onRetry });
}

export async function generateNewWorldItem(params: {
  apiKey: string;
  settings: AISettings;
  project: NovelProject;
  steeringPrompt?: string;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}): Promise<Omit<WorldBuildingItem, 'id' | 'isPinned'>> {
  const { apiKey, settings, project, steeringPrompt, signal, onRetry } = params;
  const existingLore = project.macroOutline.worldBuilding.map((w) => w.category).join(', ');

  const prompt = `${buildPinnedContextBlock(project)}

หมวดข้อมูลโลกที่มีอยู่แล้ว: ${existingLore}

คำสั่ง: สร้างข้อมูลการตั้งค่าโลก (World-Building / Lore) เพิ่ม 1 รายการที่ช่วยขยายมิติของเรื่องให้ลึกและสมจริงขึ้นโดยไม่ขัดแย้งกับกฎเดิม
${steeringPrompt?.trim() ? `ความต้องการเพิ่มเติมจากนักเขียน: ${steeringPrompt.trim()}` : ''}`;

  const jsonContract = `{ "category": "หมวดหมู่", "detail": "รายละเอียด" }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING },
      detail: { type: Type.STRING },
    },
    required: ['category', 'detail'],
  };

  const validator = z.object({
    category: z.string().min(1),
    detail: z.string().min(1),
  });

  return generateStructuredJson({ apiKey, settings, prompt, schema, jsonContract, validator, signal, onRetry });
}

export async function regenerateSingleBeat(params: {
  apiKey: string;
  settings: AISettings;
  project: NovelProject;
  beatIndex: number;
  steeringPrompt?: string;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}): Promise<PlotBeat> {
  const { apiKey, settings, project, beatIndex, steeringPrompt, signal, onRetry } = params;
  const target = project.macroOutline.plotBeats[beatIndex];

  const prompt = `${buildPinnedContextBlock(project)}

คำสั่ง: เขียนสรุปเหตุการณ์ใหม่เฉพาะจังหวะที่ ${beatIndex + 1} คือ [${target.act}] "${target.beatName}"
- คงชื่อจังหวะและองก์เดิมไว้
- ให้สอดคล้องกับจังหวะก่อนหน้าและถัดไป รวมถึงข้อมูลปักหมุด
${steeringPrompt?.trim() ? `ความต้องการเพิ่มเติมจากนักเขียน: ${steeringPrompt.trim()}` : 'ให้ปรับปรุงให้น่าสนใจและมีปมขัดแย้งเข้มข้นขึ้น'}`;

  const jsonContract = `{ "beatName": "${target.beatName}", "act": "${target.act}", "summary": "สรุปเหตุการณ์ใหม่" }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      beatName: { type: Type.STRING },
      act: { type: Type.STRING },
      summary: { type: Type.STRING },
    },
    required: ['beatName', 'act', 'summary'],
  };

  const validator = z.object({
    beatName: z.string().min(1),
    act: z.string().min(1),
    summary: z.string().min(1),
  });

  const res = await generateStructuredJson({ apiKey, settings, prompt, schema, jsonContract, validator, signal, onRetry });
  return { ...res, id: target.id };
}

export async function regenerateLogline(params: {
  apiKey: string;
  settings: AISettings;
  project: NovelProject;
  steeringPrompt?: string;
  signal?: AbortSignal;
  onRetry?: (attempt: number, waitMs: number) => void;
}): Promise<string> {
  const { apiKey, settings, project, steeringPrompt, signal, onRetry } = params;

  const prompt = `${buildPinnedContextBlock(project)}

คำสั่ง: เขียน Logline ภาษาไทยใหม่ 1-2 ประโยค ที่กระชับ ทรงพลัง ชวนอ่าน และสะท้อนแก่นเรื่องกับปมขัดแย้งหลักของนิยายเรื่องนี้
${steeringPrompt?.trim() ? `ความต้องการเพิ่มเติมจากนักเขียน: ${steeringPrompt.trim()}` : ''}`;

  const jsonContract = `{ "logline": "ประโยค Logline ใหม่" }`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      logline: { type: Type.STRING },
    },
    required: ['logline'],
  };

  const validator = z.object({ logline: z.string().min(1) });
  const res = await generateStructuredJson({ apiKey, settings, prompt, schema, jsonContract, validator, signal, onRetry });
  return res.logline;
}
