---
type: feature
priority: medium
review:
labels: [sesi-8e6130e0, order-md, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 11:30:54
updated: 2026-10-17 11:31:42
related: [261017113001, 261017113002, 261017113004]
blocked_by: [261017113001, 261017113002]
---

## Background
Kartu tiket di kolom todo viewer diberi nomor #1, #2, #3, ... menurut posisinya di order.md, satu nomor per tiket. Dari nomor itu tidak terlihat tiket mana yang boleh dikerjakan bersamaan, dan tiket yang sedang dikerjakan tidak lagi menunjukkan tempatnya dalam urutan.

## Request
Nomor di kartu menunjukkan urutan kelompok di order.md: tiket dalam satu kelompok mendapat nomor yang sama, dan tiket yang sedang dikerjakan atau di review tetap memegang nomor kelompoknya sampai selesai. Kelompok yang menunggu izin pemilik mendapat tanda yang terlihat.

## Done when
- [ ] Dua tiket dalam satu kelompok order.md tampil dengan nomor yang sama, dan kelompok berikutnya mendapat nomor sesudahnya
- [ ] Tiket di in_progress dan review yang masih tercantum di order.md tetap menampilkan nomor kelompoknya
- [ ] Setelah semua tiket kelompok pertama selesai, kelompok berikutnya menjadi #1
- [ ] Kartu dalam kelompok bertanda "menunggu pemilik" menampilkan tanda yang bisa dibaca orang awam
- [ ] Viewer dan pemeriksaan antrean membaca kelompok dengan aturan yang sama, dan uji yang ada membuktikan keduanya sepakat

## History
- 2026-10-17 11:30:54 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog

## Notes
- 2026-10-17: lahir dari pembahasan pemilik dengan Claude tentang aturan dan format order.md, sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`). Empat tiket dari sesi ini: 261017113001, 261017113002, 261017113003, 261017113004.
- 2026-10-17: nomor yang sama berarti boleh berdampingan, belum tentu sedang berjalan bersamaan (batas jumlah berdampingan dari 261017113002 bisa membuat satu tiket menunggu). Nomornya tetap sama karena tempatnya di antrean memang sama.
