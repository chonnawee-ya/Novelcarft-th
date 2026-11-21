# Deployment & Security Guide

คู่มือการนำ **PlotCraft TH** ขึ้นเว็บจริง (Production) พร้อมรายละเอียดด้านความปลอดภัยของ CORS Proxy

---

## 1. การ Deploy ขึ้น Vercel (แนะนำ — ฟรี และรองรับ CORS Proxy ในตัว)

โปรเจกต์นี้เตรียมไฟล์ [vercel.json](../vercel.json) และ [api/cors-proxy.ts](../api/cors-proxy.ts) ไว้พร้อมแล้ว สามารถ Deploy ได้ 2 วิธี:

### วิธีที่ 1: Deploy ตรงจากเครื่องด้วย Vercel CLI (เร็วที่สุด)
```bash
npx vercel --prod
```
- ล็อกอินบัญชี Vercel ในเบราว์เซอร์เมื่อระบบถาม แล้วกด Enter ยืนยันค่าเริ่มต้นทั้งหมด
- จะได้ URL `https://<project-name>.vercel.app` พร้อม HTTPS และ Edge Function `/api/cors-proxy` ใช้งานได้ทันที

### วิธีที่ 2: Deploy ผ่าน GitHub (Auto-Deploy ทุกครั้งที่ Push)
1. สร้าง Repository ใหม่บน GitHub
2. ส่งโค้ดขึ้น GitHub:
   ```bash
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
3. เข้า [vercel.com/new](https://vercel.com/new) → เลือก Repository → ตรวจสอบค่า:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. กด **Deploy**

---

## 2. การ Deploy บนแพลตฟอร์มอื่น

### Cloudflare Pages
- เชื่อม GitHub Repository → Build command: `npm run build`, Output directory: `dist`
- 7 ค่ายหลัก (OpenRouter, Gemini, OpenAI, Claude, DeepSeek, Groq, Typhoon) ทำงานได้ทันทีโดยไม่ติด CORS
- หากต้องการใช้ `/api/cors-proxy` บน Cloudflare Pages ให้ย้ายโค้ดจาก `api/cors-proxy.ts` ไปสร้างเป็น Cloudflare Pages Function ที่ `functions/api/cors-proxy.ts`

### Netlify
- เชื่อม GitHub หรืออัปโหลดโฟลเดอร์ `dist/` (หลังรัน `npm run build`) ไปที่ Netlify Drop ได้ทันทีสำหรับการใช้งานแบบ Static SPA

---

## 3. ความปลอดภัยของ CORS Proxy (`api/cors-proxy.ts`)

เนื่องจาก `/api/cors-proxy` ทำงานบน Vercel Edge Runtime เพื่อให้ Custom OpenAI API ที่ไม่เปิด CORS ใช้งานได้บนเว็บจริง ไฟล์นี้มีมาตรการป้องกัน **SSRF (Server-Side Request Forgery)** ดังนี้:

1. **HTTPS Only:** อนุญาตเฉพาะปลายทางที่ใช้โปรโตคอล `https:` บน Production
2. **Blocked Private & Metadata Hosts:** บล็อก `localhost`, `127.0.0.1`, `::1`, `*.local`, `*.internal`, ช่วง Private IPv4 (`10.x`, `172.16-31.x`, `192.168.x`) และ Cloud Metadata IP (`169.254.169.254`)
3. **Allowed AI Paths Only:** อนุญาตเฉพาะ Path ที่ลงท้ายด้วย `/chat/completions`, `/messages`, หรือ `/models` เท่านั้น
4. **Header Allowlist:** ส่งต่อเฉพาะ Header ที่จำเป็นสำหรับ AI API (`authorization`, `content-type`, `x-api-key`, `anthropic-version`, `http-referer`, `x-title`, `accept`) และไม่เก็บ Log ของ API Key หรือเนื้อหานิยาย

---

## 4. ข้อควรระวังการใช้งานบนเว็บจริง

- **การใช้ Ollama / LM Studio ร่วมกับเว็บที่ Deploy แล้ว:**  
  หากเปิดแอปจาก `https://<your-app>.vercel.app` เพื่อต่อ Ollama ในเครื่องตัวเอง ต้องตั้งค่า Environment Variable `OLLAMA_ORIGINS=*` (หรือเปิด Enable CORS ใน LM Studio) และ **ปิด** ตัวเลือก Local CORS Proxy (เพราะ Vercel Edge ไม่สามารถเรียก `localhost` บนเครื่องผู้ใช้ได้)
- **ความปลอดภัยของ API Key ฝั่งผู้ใช้:**  
  API Key เก็บอยู่ใน `LocalStorage` ของเบราว์เซอร์เท่านั้น ไม่ควรกรอก Key บนคอมพิวเตอร์สาธารณะ และควรกดปุ่มล้างคีย์ (รูปถังขยะในหน้าตั้งค่า AI) ทุกครั้งหากใช้เครื่องร่วมกับผู้อื่น
