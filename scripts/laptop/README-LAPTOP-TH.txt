Eyezheimer บนโน้ตบุ๊ก Linux Mint
================================

ครั้งแรก (ต้องต่ออินเทอร์เน็ต ประมาณ 5-10 นาที)
1. แตกไฟล์ zip ไว้ในโฟลเดอร์ Home เช่น ~/Eyezheimer
2. เปิด Terminal ในโฟลเดอร์ Eyezheimer (คลิกขวาในโฟลเดอร์ > Open in Terminal)
3. พิมพ์:  bash setup-linux.sh
   - ถ้าขึ้นว่าให้ติดตั้ง python3-venv หรือ curl ให้พิมพ์คำสั่ง sudo apt install ... ตามที่ขึ้น แล้วรัน setup ใหม่
   - สคริปต์จะติดตั้ง Node.js 24 (ผ่าน nvm), แพ็กเกจ AI ของ Python และ build เว็บ

ทุกครั้งที่จะใช้ (ไม่ต้องใช้อินเทอร์เน็ต)
- เปิด:  bash start-linux.sh   แล้วเปิด http://127.0.0.1:3000
- ปิด:   bash stop-linux.sh

รูปทดสอบ 9 รูปอยู่ที่ test-upload-images/real-octa/

ก่อนวันพรีเซนต์
- ตั้งโน้ตบุ๊กไม่ให้หลับ (System Settings > Power Management) และเสียบชาร์จไว้
- รัน start-linux.sh และทดลองอัปโหลดรูป 1 รูปก่อนขึ้นพรีเซนต์

ข้อควรรู้: ใช้เพื่อการวิจัย ไม่ใช่เครื่องมือวินิจฉัยโรค
