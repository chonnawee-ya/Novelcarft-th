# Product Specification Sheet (v3.1)

**ชื่อโปรเจกต์:** PlotCraft TH — ระบบผู้ช่วยวางโครงสร้างและแต่งนิยายภาษาไทยด้วย AI  
**ประเภทระบบ:** Single-Page Web Application (Local-First, Client-Side AI Integration)  
**AI Engine:** Universal Multi-Provider (OpenRouter, Google Gemini, OpenAI, Anthropic Claude, DeepSeek, Groq, Typhoon, Ollama, Custom OpenAI-Compatible)

---

## 1. ภาพรวมระบบ (System Overview)

PlotCraft TH เป็นเว็บแอปพลิเคชันแบบครบวงจรสำหรับนักเขียนนิยายไทย ตั้งแต่ขั้นตอน **ระดมสมอง → วางโครงเรื่องตามทฤษฎีสากล → ออกแบบโลกและตัวละคร → แตกโครงสร้างรายตอน → แต่งเนื้อหานิยายฉบับเต็ม** โดยใช้ Structured JSON Outputs ร่วมกับ Zod Validation และระบบคุมบริบทต่อเนื่อง (Pinned Lore Bible + Rolling Summary + Style Anchor) เพื่อลดปัญหาพล็อตหลุดและประหยัดการใช้ Token สูงสุด

---

## 2. คลังความรู้ในระบบ (Built-in Knowledge Base)

### 2.1 แนวนิยาย 8 แนวหลัก (ผสมผสานได้ 1–3 แนว)
1. **แฟนตาซี (Fantasy):** ต่างโลก, ระบบเกม/สเตตัส, เวทมนตร์, กำลังภายใน
2. **สืบสวนสอบสวนและระทึกขวัญ (Mystery & Thriller):** คดีฆาตกรรม, จิตวิทยา, หักมุม
3. **โรแมนติก (Romance):** โรแมนติกคอมเมดี้, ดราม่าความรัก, รั้วโรงเรียน/วัยทำงาน
4. **ไซไฟและดิสโทเปีย (Sci-Fi & Dystopia):** โลกอนาคต, AI, อวกาศ, วันสิ้นโลก
5. **สยองขวัญและเหนือธรรมชาติ (Horror & Supernatural):** เรื่องลี้ลับ, วิญญาณ, คำสาป
6. **ดราม่าและสะท้อนชีวิต (Drama & Slice of Life):** ครอบครัว, สังคม, Coming of Age
7. **แอ็กชันและผจญภัย (Action & Adventure):** เอาชีวิตรอด, การเดินทาง, การต่อสู้
8. **ย้อนยุคและอิงประวัติศาสตร์ (Historical & Period):** ย้อนเวลา, พีเรียด, ชิงบัลลังก์

### 2.2 ทฤษฎีโครงสร้างการเล่าเรื่อง 7 ทฤษฎี
1. **Three-Act Structure** (6 จังหวะ)
2. **Save the Cat! Beat Sheet** (15 จังหวะ)
3. **The Hero's Journey / Monomyth** (12 ขั้น)
4. **Kishōtenketsu — 起承転結** (4 ส่วน)
5. **Freytag's Pyramid** (5 ขั้น)
6. **Dan Harmon's Story Circle** (8 ขั้น)
7. **Mystery & Whodunit Structure** (6 ขั้น)

### 2.3 Trope Boosters & Writing Style Presets
- **12 Trope Boosters** (เช่น พระเอกคลั่งรัก, ย้อนเวลากลับมาแก้แค้น, หักมุมตอนจบ, ระบบแจ้งเตือนติ๊งๆ)
- **Random Seed Ideas** 6 แนวทางสำหรับนักเขียนที่ต้องการแรงบันดาลใจ
- **POV, Prose Style & Chapter Length Presets** (สั้น ~1,500 คำ / กลาง ~2,500 คำ / ยาว ~4,000 คำ)

---

## 3. ข้อกำหนดฟังก์ชันการทำงาน (Functional Requirements)

### FR-01: การตั้งค่า Multi-AI Provider & จัดการโปรเจกต์
- **BYOK แยกตามค่าย:** เก็บ API Key แยกตาม Preset ใน `LocalStorage` สลับค่ายได้โดยคีย์ไม่หาย
- **Live Model Fetcher:** ปุ่มดึงรายชื่อโมเดลที่ใช้ได้จริงจาก Endpoint (`GET /models`) พร้อมปุ่ม Test Connection
- **Dual-Model Routing:** กำหนด `Fast Model` สำหรับงานเบาแยกจาก `Primary Model`
- **CORS Proxy Toggle:** รองรับ Local CORS Proxy และ Vercel Edge Function สำหรับ Custom OpenAI API
- **Project Dashboard:** ค้นหา, เปิดทำงาน, ทำสำเนา, ลบ, และ Import/Export Backup (`.json`)

### FR-02: การเริ่มต้นสร้างนิยาย 3 โหมด
- **Mode 1 — แต่งสำเร็จรูป (Auto-Pilot):** พิมพ์ไอเดียสั้นๆ + เลือก Trope → AI Story Director เลือกชื่อเรื่อง 3 ตัวเลือก แนว ทฤษฎีพร้อมเหตุผล โทน จำนวนตอน และ POV → เลือกรัน Stage 1 อย่างเดียว หรือ **Full Auto-Pilot** (Stage 1 + ตอนที่ 1–5 + แต่งตอนที่ 1 ทันที)
- **Mode 2 — ตั้งค่าเองแบบละเอียด (Custom Scratch):** เลือกทุกพารามิเตอร์เอง
- **Mode 3 — นำเข้าโน้ตเดิม (Import Draft):** วางข้อความหรืออัปโหลด `.txt` / `.md` (ไม่เกิน 500 KB) ให้ AI สกัดจัดลง Schema โดยยึดแก่นเรื่องเดิม

### FR-03: กระบวนการสร้างเนื้อหา 3 ระยะ (Multi-Stage Pipeline)
- **Stage 1 (Macro Outliner):** สร้าง `logline`, `worldBuilding`, `characters`, `plotBeats` ครบตามทฤษฎี
- **Stage 2 (Chapter Beats Expander):** แตกโครงรายตอนทีละชุด (5 ตอนปกติ / 3 ตอนในโหมดประหยัด) พร้อม `linkedBeat` และอัปเดต `rollingSummary` อัตโนมัติ
- **Stage 3 (AI Prose Writer):** แต่งเนื้อหานิยายฉบับเต็มต่อตอน โดยดึง Pinned Canon + Rolling Summary + ช่วงท้ายตอนก่อนหน้า + Style Anchor พร้อมปุ่ม **Auto-Pilot แต่งตอนที่เหลือทั้งหมด**

### FR-04: การแก้ไข ควบคุมบริบท และตรวจสอบคุณภาพ
- **Lore & Character Pinning (`isPinned`):** กำหนดความจริงสูงสุด (Strict Canon) ที่ AI ห้ามขัดแย้ง
- **Inline Editing & Reordering:** แก้ไขได้ทุกฟิลด์ เลื่อนลำดับ Beat และลำดับตอนพร้อมรันเลขใหม่อัตโนมัติ
- **Granular Regeneration + Steering Prompt:** เจนใหม่เฉพาะส่วนพร้อมใส่คำสั่งชี้นำ และย้อนกลับได้ด้วย **Undo Stack (20 ขั้น)**
- **Highlight-to-Refine:** ลากคลุมเฉพาะย่อหน้าใน Stage 3 เพื่อปรับเฉพาะท่อนที่เลือก
- **Style Anchor:** ลองชิม 3 สำนวนเปิดเรื่องแล้วล็อกสำนวนที่ชอบคุมโทนทั้งเรื่อง
- **Continuity Audit:** AI บรรณาธิการตรวจพล็อตโฮลทั้งโปรเจกต์ ให้คะแนน 0–100 และชี้จุดแก้ไข

### FR-05: ระบบบริหารจัดการ Token
- แสดงประมาณการ Token แบบเรียลไทม์ (`~X tok`) พร้อมเตือนเมื่อปักหมุดเกิน 10 การ์ด
- สวิตช์ **โหมดประหยัด (`⚡ Economy Mode`)** และปุ่ม **บีบอัด Rolling Summary**

### FR-06: การส่งออกข้อมูล (Export System)
- **Outline & Lore:** Markdown (`.md`), Plain Text (`.txt`), JSON Backup (`.json`)
- **Manuscript (ต้นฉบับพร้อมลงเว็บ):** `_manuscript.md` และ `_manuscript.txt` (รวมเฉพาะตอนที่แต่งเนื้อเรื่องแล้ว)

---

## 4. ข้อกำหนดที่ไม่ใช่ฟังก์ชัน (Non-Functional Requirements)

1. **Schema Reliability:** ตรวจสอบผลลัพธ์ JSON ทุกครั้งด้วย **Zod** ก่อนบันทึกลง IndexedDB
2. **Error & Rate Limit Resilience:** ระบบ Auto-Retry (Exponential Backoff สูงสุด 3 ครั้ง) สำหรับ HTTP `429` / `503` และ Validation Error พร้อมปุ่ม Cancel (`AbortController`)
3. **Data Privacy:** ไม่เก็บข้อมูลนิยายหรือ API Key บนเซิร์ฟเวอร์ภายนอก สื่อสารตรงจากเบราว์เซอร์ (หรือผ่าน Proxy ที่ไม่บันทึก Log เมื่อผู้ใช้เปิดใช้กับ Custom API)
4. **Responsive UX:** ใช้งานได้ดีทั้ง Desktop และ Mobile พร้อมฟอนต์ภาษาไทย (`Noto Sans Thai` / `Sarabun`)
