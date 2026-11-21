# PlotCraft TH — สตูดิโอวางโครงเรื่องและแต่งนิยายภาษาไทยด้วย AI

> **Structured Thai Novel Outliner & Auto-Pilot Prose Studio**  
> เว็บแอปพลิเคชันแบบ **Local-First & BYOK (Bring Your Own Key)** สำหรับนักเขียนนิยายไทย ช่วยตั้งแต่คิดไอเดีย วางโครงเรื่องตามทฤษฎีการเล่าเรื่องสากล จัดการ Lore/ตัวละคร แตกโครงรายตอน ไปจนถึงแต่งเนื้อหานิยายฉบับเต็มพร้อมลงเว็บ โดยเชื่อมต่อตรงกับ AI ได้ทุกค่าย

---

## จุดเด่นหลัก (Key Highlights)

- **รองรับ AI API ทุกค่าย (Universal Multi-Provider):** OpenRouter, Google Gemini, OpenAI, Anthropic Claude, DeepSeek, Groq, Typhoon (โมเดลไทย), Ollama / LM Studio (Local) และ Custom OpenAI-Compatible API (พร้อม CORS Proxy ในตัว)
- **โหมดแต่งนิยายสำเร็จรูป (Auto-Pilot Novel Studio):** พิมพ์แค่ไอเดีย 1–3 ประโยค ให้ **AI Story Director** เลือกชื่อเรื่อง 3 ตัวเลือก แนวนิยาย ทฤษฎีโครงเรื่องพร้อมเหตุผล โทน และ POV ให้ครบ แล้วรัน **Full Auto-Pilot** สร้างโครง + ตอนที่ 1–5 + แต่งตอนที่ 1 พร้อมอ่านทันที
- **คลังความรู้การเล่าเรื่องในตัว:** แนวนิยาย 8 แนวหลัก (ผสมได้สูงสุด 3 แนว), ทฤษฎีโครงสร้าง 7 ทฤษฎีสากล, และ 12 Trope Boosters
- **กระบวนการสร้าง 3 ระยะ (Stage 1 → 2 → 3):**
  - **Stage 1 (Macro Outliner):** สร้าง Logline, World-Building, Characters, Plot Beats
  - **Stage 2 (Chapter Beats Expander):** แตกโครงรายตอนทีละชุด พร้อมอัปเดต `Rolling Summary` อัตโนมัติ
  - **Stage 3 (AI Prose Writer):** แต่งเนื้อหานิยายเต็มตอน + **Style Anchor** (ลองชิม 3 สำนวน) + **Auto-Pilot** แต่งต่อเนื่องทุกตอน
- **ระบบประหยัด Token ครบ 6 มิติ:** Smart Context Pruning, Beat Windowing, **Highlight-to-Refine** (ลากคลุมแก้เฉพาะย่อหน้า ประหยัด 80–90%), Prompt Caching Layout, Dual-Model Routing (Fast Model), บีบอัด Rolling Summary และโหมดประหยัด (`⚡`)
- **ความเป็นส่วนตัว 100% (Local-First):** ข้อมูลนิยายเก็บใน **IndexedDB** และ API Key เก็บใน **LocalStorage** ของเบราว์เซอร์ผู้ใช้เท่านั้น
- **ส่งออกพร้อมใช้งานทันที:** Export โครงเรื่อง (`.md`, `.txt`, `.json` Backup) และ Export ต้นฉบับนิยายพร้อมลง ReadAWrite / Dek-D (`_manuscript.md`, `_manuscript.txt`)

---

## Tech Stack

| หมวดหมู่ | เทคโนโลยี |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6 |
| **UI & Styling** | Tailwind CSS v4, Lucide Icons, Noto Sans Thai & Sarabun |
| **AI Integration** | `@google/genai`, OpenAI-Compatible Fetch Adapter, Anthropic Messages Adapter |
| **Validation** | Zod (Runtime JSON Schema Validation) |
| **Local Database** | Dexie.js (IndexedDB) + LocalStorage |
| **State Management** | Zustand |
| **Deployment** | Vercel (Static SPA + Edge Function `/api/cors-proxy`) |

---

## การติดตั้งและเริ่มต้นใช้งาน (Quick Start)

### ข้อกำหนดเบื้องต้น
- Node.js 20+ และ npm

### คำสั่งรันบนเครื่อง
```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เปิดโหมดพัฒนา (Dev Server พร้อม Local CORS Proxy)
npm run dev

# 3. ตรวจสอบ TypeScript และ Build สำหรับ Production
npm run build

# 4. พรีวิวไฟล์ Production Build
npm run preview
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:5173/` → คลิก **ตั้งค่า AI API** มุมขวาบน → เลือกค่าย AI และใส่คีย์ → กด **+ สร้างโครงเรื่องใหม่**

---

## โครงสร้างโฟลเดอร์ (Project Structure)

```text
thai-novel-outliner/
├── api/
│   └── cors-proxy.ts             # Vercel Edge Function แก้ CORS (ป้องกัน SSRF)
├── docs/                         # เอกสารประกอบโปรเจกต์ฉบับสมบูรณ์
│   ├── PRODUCT_SPEC.md           # สเปกผลิตภัณฑ์ฉบับอัปเดต (v3)
│   ├── ARCHITECTURE.md           # สถาปัตยกรรมระบบ Data Schema & Token Optimization
│   ├── AI_PROMPT_RULES.md        # กฎเหล็กของ AI และ Prompt Engineering
│   ├── USER_GUIDE.md             # คู่มือการใช้งานสำหรับนักเขียน
│   └── DEPLOYMENT.md             # คู่มือการ Deploy ขึ้นเว็บจริง
├── src/
│   ├── components/
│   │   ├── workspace/
│   │   │   ├── OverviewTab.tsx   # แท็บ 1: Logline, Rolling Summary & Plot Beats
│   │   │   ├── WorldBuildingTab.tsx # แท็บ 2: Lore Bible & Pinning
│   │   │   ├── CharactersTab.tsx # แท็บ 3: ตัวละคร ความสัมพันธ์ & Pinning
│   │   │   ├── ChaptersTab.tsx   # แท็บ 4: โครงสร้างรายตอน (Stage 2)
│   │   │   └── WriterTab.tsx     # แท็บ 5: แต่งนิยายเต็มตอน (Stage 3 + Highlight-to-Refine)
│   │   ├── ApiKeyModal.tsx       # ตั้งค่า AI Provider, Fast Model, CORS Proxy
│   │   ├── ContinuityAuditModal.tsx # AI บรรณาธิการตรวจพล็อตโฮล
│   │   ├── Dashboard.tsx         # คลังโปรเจกต์ ค้นหา ทำสำเนา Backup/Restore
│   │   ├── Header.tsx            # แถบนำทางหลักและสถานะ AI
│   │   ├── NewProjectWizard.tsx  # 3 โหมดสร้างโปรเจกต์ (Auto-Pilot / Custom / Import)
│   │   ├── SteeringModal.tsx     # หน้าต่างใส่คำสั่งเพิ่มเติม (Steering Prompt)
│   │   ├── StyleAnchorModal.tsx  # ลองชิม 3 สำนวนเปิดเรื่อง (Style Anchor)
│   │   ├── ToastContainer.tsx    # ระบบแจ้งเตือน
│   │   └── Workspace.tsx         # เปลือกพื้นที่ทำงาน 5 แท็บ + Token Estimator
│   ├── data/
│   │   ├── aiProviders.ts        # รายการ Preset ผู้ให้บริการ AI ทั้ง 9 รูปแบบ
│   │   └── knowledgeBase.ts      # 8 แนวนิยาย, 7 ทฤษฎีโครงเรื่อง, Trope Boosters
│   ├── db/
│   │   └── database.ts           # Dexie.js IndexedDB & LocalStorage helpers
│   ├── services/
│   │   └── geminiService.ts      # Universal Multi-Provider AI Engine & Token Pruning
│   ├── store/
│   │   └── useAppStore.ts        # Zustand Global Store & Undo Stack
│   ├── types/
│   │   └── novel.ts              # TypeScript Types & Zod Schemas (v3)
│   └── utils/
│       ├── exporter.ts           # Export Outline & Manuscript (.md, .txt, .json)
│       └── tokenEstimator.ts     # ตัวประมาณการ Token ภาษาไทย/อังกฤษ
├── CHANGELOG.md
├── vercel.json
└── vite.config.ts                # Vite Config + Local CORS Proxy Middleware
```

---

## สารบัญเอกสาร (Documentation Index)

- [สเปกผลิตภัณฑ์ (Product Specification v3)](./docs/PRODUCT_SPEC.md)
- [สถาปัตยกรรมระบบและโครงสร้างข้อมูล (Architecture & Schema)](./docs/ARCHITECTURE.md)
- [กฎเหล็กของ AI และ Prompt Engineering (AI Prompt Rules)](./docs/AI_PROMPT_RULES.md)
- [คู่มือการใช้งานสำหรับนักเขียน (User Guide)](./docs/USER_GUIDE.md)
- [คู่มือการนำขึ้นเว็บจริง (Deployment Guide)](./docs/DEPLOYMENT.md)
- [ประวัติการพัฒนา (Changelog)](./CHANGELOG.md)
