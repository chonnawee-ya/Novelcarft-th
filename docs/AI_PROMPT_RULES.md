# AI Prompt Engineering & Strict Rules Guide

เอกสารนี้รวบรวม **กฎเหล็กของ AI (AI Guardrails)** โครงสร้าง `systemInstruction` และการจัดการข้อผิดพลาดที่ใช้งานจริงใน [src/services/geminiService.ts](../src/services/geminiService.ts)

---

## 1. กฎเหล็ก 6 หมวดที่ระบบบังคับกับ AI

1. **Strict Schema & JSON Format:**
   - งานโครงเรื่องทั้งหมด (Stage 1, Stage 2, Auto-Director, Style Anchor, Continuity Audit) ต้องตอบกลับเป็น **JSON Object ล้วน** ไม่มีคำทักทายหรือคำอธิบายนอก JSON
   - ห้ามปล่อยฟิลด์บังคับเป็นค่าว่างหรือ Placeholder (`TBD`, `-`)
   - จำนวน `plotBeats` ต้องตรงตามทฤษฎีที่เลือก และจำนวนตอนใน Batch ต้องตรงตามที่ขอ
2. **Canon & Continuity (ความต่อเนื่องของเนื้อเรื่อง):**
   - ข้อมูลที่ถูกปักหมุด (`isPinned: true`) ทั้ง Lore และตัวละครถือเป็น **ความจริงสูงสุด (Strict Canon)** ห้าม AI ขัดแย้งโดยเด็ดขาด
   - ทุกตอนใหม่ต้องเชื่อมโยงต่อจาก `Rolling Summary` และ `Cliffhanger` (หรือช่วงท้าย 400–700 ตัวอักษรของตอนก่อนหน้าใน Stage 3)
   - ห้ามเร่งจบเรื่องก่อนถึง `targetChapterCount`
3. **Granular Regeneration & Highlight-to-Refine:**
   - เมื่อสั่งเจนใหม่เฉพาะจุด (เช่น ตอนที่ 4 หรือ Beat ที่ 3) ห้ามเปลี่ยนแปลงข้อมูลส่วนอื่น และต้องเชื่อมหน้า-หลังให้สนิท
   - เมื่อใช้ Highlight-to-Refine AI ต้องส่งกลับ **เฉพาะข้อความส่วนที่แก้** ห้ามทวนข้อความก่อนหน้าหรือถัดไป
4. **Thai Literary Quality (คุณภาพภาษาไทย):**
   - บังคับผลลัพธ์ภาษาไทยที่เป็นธรรมชาติแบบงานวรรณกรรมไทย ห้ามติดสำนวนแปลตรงตัวจากภาษาอังกฤษ (Translationese)
   - ใช้หลัก **"Show, Don't Tell"** ในโหมดแต่งเนื้อเรื่อง (Stage 3) และใช้ภาษาที่กระชับตรงประเด็นในโหมดวางโครง (Stage 1–2)
5. **Source Faithfulness (สำหรับ Import Draft):**
   - ยึดแก่นเรื่อง ชื่อตัวละคร และปมเดิมของผู้เขียนเป็นหลัก ห้ามมโนเปลี่ยนโครงหลักที่ผู้เขียนระบุมา
6. **Safety & Runtime Validation:**
   - ไม่เชื่อ Raw Output จาก AI 100% — ผ่าน `extractJsonText()` และตรวจสอบด้วย **Zod Schema** ทุกครั้งก่อนบันทึกลง IndexedDB

---

## 2. System Instructions ที่ใช้ในระบบ

> ระบบเขียนกฎคำสั่งเป็นภาษาอังกฤษแบบกระชับเพื่อลด Overhead ของ Token ลง ~55% และบังคับให้ผลลัพธ์ทุกฟิลด์เป็นภาษาไทยคุณภาพระดับตีพิมพ์

### 2.1 โหมดวางโครงเรื่อง (`BASE_SYSTEM_INSTRUCTION`)
```text
Role: Master Thai Fiction Editor & Story Architect (Creative Fiction Outlining).
Strict Rules:
1. Return ONLY valid JSON matching the requested schema. No greetings, markdown, or extra text.
2. Never leave required fields empty or use placeholders ("TBD", "-").
3. Write ALL string values in natural, publication-grade Thai (avoid literal English translationese).
4. Match character names, tone, and diction to the specified genres and tone.
5. Keep outlines concise and actionable (goals, conflicts, outcomes)—do not write full prose dialogues in outline mode.
6. Treat PINNED LORE and PINNED CHARACTERS as strict canon; never contradict them.
7. Maintain strict continuity with Rolling Summary and prior cliffhangers; pace properly to targetChapterCount.
```

### 2.2 โหมดแต่งนิยายเต็มตอน (`PROSE_WRITER_SYSTEM_INSTRUCTION`)
```text
Role: Bestselling Thai Fiction Novelist.
Rules:
1. Output ONLY ready-to-read Thai novel prose. No greetings, notes, or meta commentary.
2. Write natural, vivid Thai literature (avoid literal English translationese).
3. Use "Show, Don't Tell": convey emotion via action, dialogue, sensory detail, and pacing.
4. Strictly respect PINNED LORE and PINNED CHARACTERS.
5. Connect seamlessly from the previous chapter's ending and end with a compelling cliffhanger.
```

---

## 3. การจัดการ Error, Safety Filter และ Retry

| สถานการณ์ | วิธีรับมือของระบบ |
| :--- | :--- |
| **HTTP `429` (Rate Limit) / `503`** | Auto-Retry แบบ Exponential Backoff สูงสุด 3 ครั้ง (รอ 2s → 4s → 8s) พร้อมแจ้งสถานะให้ผู้ใช้เห็น |
| **JSON Parse / Zod Validation Failed** | ตัด Markdown fence (```` ```json ````) และสกัด `{ ... }` อัตโนมัติ หากยังผิด Schema จะ Retry อัตโนมัติสูงสุด 3 ครั้ง |
| **Gemini `SAFETY` / `PROHIBITED_CONTENT`** | ตั้งค่า `BLOCK_ONLY_HIGH` สำหรับงานนิยาย หากยังถูกบล็อกจะหยุดทันทีและแจ้งข้อความภาษาไทยที่เข้าใจง่าย |
| **`MAX_TOKENS` (JSON โดนตัดจบ)** | แจ้งเตือนชัดเจนโดยไม่เขียนทับข้อมูลเดิมใน IndexedDB |
| **ผู้ใช้กดยกเลิก (Cancel)** | ส่ง `AbortSignal` ยกเลิกคำขอทันทีและคืนสถานะปุ่มทั้งหมด |
| **Model ไม่รองรับ `response_format`** | OpenAI-Compatible Adapter จะ Fallback ลบ `response_format` แล้วส่งใหม่อัตโนมัติ |

---

## 4. Dual-Model Task Routing

| กลุ่มงาน | โมเดลที่ใช้ | ฟังก์ชัน |
| :--- | :--- | :--- |
| **งานเบา (Fast Model)** | `settings.fastModel` (ถ้าตั้งไว้) | `analyzeIdeaAutoDirector`, `regenerateLogline`, `generateNewCharacter`, `generateNewWorldItem`, `compressRollingSummary` |
| **งานหลัก (Primary Model)** | `settings.model` | `generateMacroOutline`, `generateChapterBatch`, `regenerateSingleChapter`, `regenerateSingleBeat`, `generateOpeningHookSamples`, `writeChapterProse`, `refineChapterProse`, `refineSelectedProse`, `auditProjectContinuity` |
