# ทำให้ AI ใช้ได้บนเว็บจริง (Vercel)

เว็บบน Vercel เรียก backend Python ที่รันโมเดล ONNX ถ้าไม่มี backend ให้เรียก เว็บจะขึ้น "Analysis unavailable" (ไม่สร้างตัวเลขปลอม)
ต้องตั้ง 2 ค่าในหน้า Vercel → โปรเจกต์ **teng1** → Settings → Environment Variables แล้วกด Redeploy:

| ชื่อ | ค่า |
| --- | --- |
| `THERMOEYE_LOCAL_INFERENCE_URL` | ที่อยู่ backend (ไม่มี `/` ท้าย) |
| `THERMOEYE_BACKEND_KEY` | รหัสลับ ต้องตรงกับที่ตั้งไว้ฝั่ง backend |

backend ตรวจรหัสนี้จากหัว `X-Thermoeye-Key` ทุกคำขอ `/octa/*` คนนอกที่ไม่มีรหัสได้ 401

## ทางที่ 1: ใช้คอมคุณเป็นเซิร์ฟเวอร์ชั่วคราว (ได้ผลวันนี้)

ข้อจำกัด: ใช้ได้เฉพาะตอนคอมเปิดและโปรแกรมรันอยู่ ที่อยู่เปลี่ยนทุกครั้งที่เปิดอุโมงค์ใหม่

1. สร้างรหัส (ไม่ต้องแชร์ที่ไหน): `backend\.venv\Scripts\python.exe -c "import secrets;print(secrets.token_hex(24))"`
2. เปิดโปรแกรมพร้อมรหัสใน PowerShell:
   ```powershell
   Set-Location D:\Themoeye\project\teng1
   $env:THERMOEYE_BACKEND_KEY = "<รหัสที่สร้าง>"
   .\scripts\local-demo.ps1 start
   ```
3. เปิดอุโมงค์ (ติดตั้ง cloudflared แล้ว) ในหน้าต่างอีกอัน:
   ```powershell
   & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
   ```
   จะได้ที่อยู่รูป `https://xxxx.trycloudflare.com` นำไปใส่ `THERMOEYE_LOCAL_INFERENCE_URL`
4. ตั้งสองค่าบน Vercel แล้ว Redeploy

## ทางที่ 2: โฮสต์ถาวรบน Hugging Face Spaces (ฟรี)

1. สร้างชุดไฟล์ (อยู่นอก git จึงไม่ขึ้น GitHub พร้อมไฟล์โมเดล):
   `backend\.venv\Scripts\python.exe scripts\build_space_bundle.py` → ได้โฟลเดอร์ `D:\Themoeye\deploy\hf-space` (7.7 MB)
2. ที่ huggingface.co: New Space → SDK **Docker** → ตั้งเป็น Private หรือ Public ก็ได้ (มีรหัสกันอยู่)
3. อัปโหลดทุกไฟล์ในโฟลเดอร์ `hf-space` (Files → Add file → Upload files)
4. Space → Settings → Variables and secrets → เพิ่ม **Secret** ชื่อ `THERMOEYE_BACKEND_KEY`
5. รอ build เสร็จ ที่อยู่คือ `https://<ชื่อผู้ใช้>-<ชื่อspace>.hf.space` นำไปใส่ `THERMOEYE_LOCAL_INFERENCE_URL` บน Vercel พร้อมรหัสเดียวกัน แล้ว Redeploy

ข้อควรรู้: Space ฟรีจะหลับเมื่อไม่มีคนใช้ คำขอแรกหลังตื่นอาจช้า 30–60 วินาที และเว็บรอแค่ 25 วินาที อาจขึ้น "unavailable" ครั้งแรก ให้ลองใหม่อีกครั้ง

## ตรวจว่าใช้ได้

```bash
curl https://<ที่อยู่ backend>/readiness
```
ต้องได้ `"status":"ready"` แล้วลองอัปโหลดภาพจาก `test-upload-images/real-octa/` บนเว็บ

## สิ่งที่โมเดลทำได้จริง

- แบ่งเส้นเลือดในภาพ OCTA แบบ en-face (เครื่อง Optovue 3×3 mm เหมือนชุดเทรน) Dice ~0.71 เทียบกับเฉลย 9 ภาพ
- วัด vessel density ได้ แต่สูงกว่าค่าจริงทุกภาพ จึงยังไม่ควรใช้เทียบระหว่างคนไข้
- ยังทำนายความเสี่ยงอัลไซเมอร์ไม่ได้ ต้องมีข้อมูลผู้ป่วยจริงที่ผ่านจริยธรรม
