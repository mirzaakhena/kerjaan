---
type: task
priority: medium
review: quick
labels: [sesi-8e6130e0]
reporter: mirza
assign_to: claude
created: 2026-10-17 18:44:41
updated: 2026-10-18 00:01:00
related: [261017175101, 261017184401]
blocked_by: [261017184401]
---

## Background
Setelah viewer (261017175101) dan skrip, definisi agen, panduan, serta README (261017184401) berbahasa Inggris, tidak ada yang mencegah teks Indonesia masuk lagi. Label "diam" di viewer lolos justru karena tidak ada pemeriksaan seperti itu.

## Request
Sebuah uji otomatis gagal bila kata Indonesia yang umum muncul lagi di berkas skill atau viewer, dengan daftar pengecualian yang tertulis untuk contoh yang sengaja menunjukkan papan berbahasa lain. Isi papan (.kerjaan/) tidak diperiksa.

## Done when
- [x] Sebuah uji otomatis gagal bila kata Indonesia yang umum muncul lagi di berkas skill atau viewer, dan menyebut berkas serta barisnya
- [x] Pengecualian untuk contoh papan berbahasa lain tertulis di satu daftar, dan setiap pengecualian menyebut alasannya
- [x] Uji itu lulus pada repo saat ini, dan papan repo ini yang berbahasa Indonesia tidak membuatnya gagal
- [x] Menambahkan satu kata Indonesia, misalnya "diam", ke teks viewer atau pesan skrip membuat uji itu gagal

## History
- 2026-10-17 18:44:41 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 18:45:43 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 23:52:41 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-18 00:01:00 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review

## Notes
- 2026-10-17: dipecah dari 261017175101 atas jawaban pemilik #1 "Pecah jadi tiga" (sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02).
- 2026-10-17 18:45:34: files estimated to change: `uji/`
- 2026-10-18: dikerjakan di `tests/english-only.test.mjs`. Uji membaca setiap berkas yang dikenal git (termasuk berkas baru yang belum di-commit) di luar `.kerjaan/`, mencari ~150 kata Indonesia umum yang bukan kata Inggris (kata utuh, tanpa huruf/angka di sampingnya dan tanpa titik di depan, supaya `tox.ini` tidak terbaca "ini"), lalu menyebut `berkas:baris: "kata" in: <baris>`. Cakupannya seluruh repo, termasuk tests/, bukan hanya skills/ dan viewer/, karena teks uji juga berbahasa Inggris sejak 184401.
- Keputusan: pengecualian ada di satu daftar `EXCEPTIONS` di berkas uji itu, masing-masing dengan alasan; sebisa mungkin sempit (berkas + potongan baris), hanya tiga yang seluruh berkas (uji ini sendiri, `tests/real-order/old.md`, `tests/trigger/previous-description.txt`). Uji kedua gagal bila pengecualian tanpa alasan atau sudah tidak mengizinkan apa pun, supaya daftarnya tidak membusuk.
- Keputusan: nama-nama Indonesia yang kebetulan di uji (bukan contoh papan berbahasa lain) diganti ke Inggris, bukan dikecualikan: `Batal.md`, `Hampir penuh.md` (new-ticket), `lagi`, `samping` (release), `lagi`, `tangan` (worktree).
- Papan repo ini: salinan uji yang diarahkan ke main tree (yang punya `.kerjaan/` berbahasa Indonesia) tidak melaporkan satu baris pun dari `.kerjaan/`. Uji ketiga membuktikannya juga secara otomatis: repo sementara dengan tiket Indonesia di `.kerjaan/` dan kata Indonesia di `viewer/web/agent.js` serta `skills/kerjaan/scripts/queue.sh`, hanya dua yang terakhir dilaporkan, dengan berkas dan barisnya.
- Dirusak dengan sengaja (dari salinan, dipulihkan dari salinan): "// status: diam" di `viewer/web/agent.js` → uji 1 merah, menyebut `viewer/web/agent.js:85`; `echo "tiket tidak ada"` di `queue.sh` → uji 1 merah dengan berkas:baris; pengecualian `.kerjaan/` dibuang → uji 3 merah; aturan titik dibuang → uji 1 merah di `agents/kerjaan-reviewer.md:71` (`tox.ini`) dan uji 3 merah; pengecualian dibuat seluruh berkas → uji 2 dan 3 merah; pengecualian basi ditambahkan → uji 2 merah (hijau bila pemeriksaannya dimatikan).
- README, bagian menjalankan uji, kini menyebut penjaga ini dan tempat daftar pengecualiannya.
- 2026-10-18 00:00:55: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` exited 0 after 3m30s, on content fingerprint 82389a0e457e03c47537f5fe42d95fae83a49bc2 (the same before and after the run; .kerjaan/ left out).
- 2026-10-18 00:01:00: review covers branch tiket-261017184402 at bbcc2119fbe3b959afd3e9951fd8a5162df1d737, which holds main at 3354345cb9869f491fa6b9be073773d445016c03 (code outside .kerjaan/); the latest test run passed on exactly this content.
