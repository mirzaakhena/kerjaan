---
type: feature
priority: medium
review: quick
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 12:06:46
updated: 2026-10-28 16:47:08
related: [261028112701, 261016084202]
blocked_by: []
---

## Background
Papan di peramban menunjukkan langkah terakhir agen pada tiap tiket,
misalnya "● worker · Menjalankan uji · 12 dtk lalu" (261016084202). Baris itu
hanya menyebut langkah yang sudah dimulai. Sesudah sebuah langkah selesai,
agen sering diam cukup lama sebelum langkah berikutnya: ia sedang berpikir,
menyusun kode yang akan ditulis, atau menulis laporan. Selama itu papan tetap
menunjukkan langkah lama dengan waktu yang terus bertambah, jadi agen yang
sedang berpikir tampak sama dengan agen yang menunggu perintah lama, dan sama
dengan agen yang macet.

Ukuran kasar dari tiga pengerja di proyek nukitu-mockup (28 Okt 2026, dari
catatan langkah agen): 18–37% waktu pengerja habis di fase berpikir dan
menulis ini, 59–80% menunggu perintah lama (uji, sabotase), sisanya hampir
nol. Bagian menunggu perintah ditangani 261028112701; tiket ini bagian yang
lain.

## Request
Dari kartu tiket, pemilik bisa melihat apakah agen sedang menjalankan sebuah
perintah atau sedang berpikir dan menulis, dan sudah berapa lama dalam
keadaan itu, tanpa isi pikirannya ditampilkan.

## Done when
- [x] Selagi agen menjalankan sebuah alat (perintah, membaca berkas, dan sejenisnya), kartunya menyebut langkah itu dan sudah berapa lama berjalan
- [x] Sesudah langkah itu selesai dan sebelum langkah berikutnya, kartunya menyebut bahwa agen sedang berpikir atau menulis, dan sudah berapa lama
- [x] Pergantian antara kedua keadaan itu terlihat sendiri dalam beberapa detik, tanpa memuat ulang halaman
- [x] Isi pikiran, isi pesan, dan hasil alat tetap tidak pernah tampil
- [x] Agen yang sudah berhenti tetap ditandai berhenti, bukan "sedang berpikir"
- [ ] ~~Pemilik melihat kedua keadaan itu bergantian pada kartu sebuah tiket yang sedang dikerjakan (langkah di Notes)~~ (dibatalkan pemilik 28 Okt 2026: butir yang hanya bisa dicek orang dihapus)

## History
- 2026-10-28 12:06:46 2894605e-2452-4259-b7ae-7187f1df18cb backlog
- 2026-10-28 12:47:43 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 16:32:33 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 16:46:05 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 16:47:08 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup, dipisah dari 261028112701 karena tiket itu sudah berisi 8 butir Done when.
- Dugaan cara membedakannya (belum diukur): di catatan langkah agen, alat yang sudah dipanggil tapi belum ada hasilnya berarti sedang berjalan; sesudah hasilnya tercatat dan belum ada langkah baru, agen sedang menghasilkan jawaban. Waktu antrean di sisi server Anthropic tidak bisa dibedakan dari berpikir lewat catatan ini, jadi keduanya tampil sebagai "berpikir atau menulis".
- Skrip ukur yang dipakai untuk angka di Background ada di scratchpad sesi nukitu-mockup itu (`waktu-pengerja/ukur.mjs`), tidak dirawat; kategorinya ditebak dari kata di keterangan perintah.
- 2026-10-28 12:15:48: files estimated to change: `viewer/agents.mjs`, `viewer/tests/agent-board.test.mjs`, `viewer/tests/agents.test.mjs`, `viewer/web/agent.js`, `viewer/web/style.css`
- 2026-10-28 12:16:51: answered question: Butir 'Pemilik melihat kedua keadaan itu bergantian pada kartu sebuah tiket yang sedang dikerjakan' hanya bisa dicek orang. Saran: ditunda (skenario tangan, rantai berjalan terus); pemilik akan melihatnya sendiri saat tiket berikutnya dikerjakan. Pilihan lain: rantai berhenti sampai pemilik mengeceknya.
  answer, 2026-10-28 12:47:01: Hapus semua: butir yang hanya bisa dicek orang dicoret, dibatalkan pemilik, tanpa skenario tangan.
- 2026-10-28 (pengerja): cara kerjanya. `viewer/agents.mjs` mencatat panggilan alat yang belum dijawab (hanya ID panggilan dan ID pesan; dari hasil alat hanya `tool_use_id` yang dibaca). Ada yang belum dijawab: `phase: 'tool'`, sejak langkah terakhir dimulai. Semua sudah dijawab: `phase: 'thinking'`, sejak jawaban terakhir masuk (agen baru mulai: sejak prompt pertama). Agen yang sudah berakhir: `phase: null`. Pesan asisten baru menganggap semua panggilan pesan sebelumnya sudah dijawab, supaya panggilan yang jawabannya hilang dari catatan tidak membuat kartu "running" selamanya; tanpa ID pesan, tiap baris dianggap pesan baru.
- Kartu (`viewer/web/agent.js`): menjalankan alat → "<langkah> · running 3 min"; di antara langkah → "thinking or writing · for 12 s" (miring, title menyebut langkah terakhir). Agen selesai, terinterupsi, atau senyap ≥20 menit tetap memakai bentuk lama (langkah terakhir · x ago) dengan kata stopped/done/interrupted/silent, tidak pernah "thinking". Laci kanan memakai baris yang sama.
- Keputusan: warna hijau/kuning/merah tetap dihitung dari tanda hidup terakhir di catatan seperti sebelumnya, jadi alat yang berjalan >2 menit tetap kuning "quiet" (dengan "running N min"). Alasan: tidak mengubah arti tanda yang sudah ada; kemajuan perintah panjang bagian 261028112701.
- Bukti merah (sabotase, tiap pemasangan, dipulihkan dari salinan): jawaban tidak menghapus panggilan terbuka → 2 uji agents.test merah ("running a tool or thinking…", "…read as the log grows"); `thinkingSince` tidak diisi → 2 merah yang sama; pesan baru tidak menghapus panggilan basi → "running a tool or thinking…" merah; fase dihitung juga untuk agen yang berakhir (server) → merah yang sama; fase 'tool' tidak pernah → 2 merah; di halaman, cek `a.ended`, cek senyap, atau keduanya dihapus → "an agent that has stopped is marked so…" merah tiap kali; teks "thinking or writing" diganti label langkah → "the agent line: running a tool…" merah; durasi "running" diganti "x ago" → merah yang sama; gaya miring dihapus → uji peramban "card: turns from the running step…" merah. Penghapusan panggilan terbuka saat interupsi tetap hijau saat disabotase: ternyata berlebih (agen terinterupsi sudah `phase: null`, pesan berikutnya menghapusnya), jadi baris itu dibuang.
- Diukur pada catatan agen asli proyek ini: agen ini sendiri terbaca `tool` dengan langkah yang sedang berjalan, pengerja 261028112701 terbaca `thinking`, semua peninjau yang selesai `phase: null`.

- 2026-10-28 16:45:55: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` exited 0 after 4m8s, on content fingerprint 7046c869ec197c722d8beadb5da52b1543fa4d54 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28 16:46:05: review covers branch ticket-261028120601 at 427738b0ad7a1850f1b320fa4a459cc4e32fa09b, which holds main at ec241cff16fb5cc25b339c04e5ba6148c739ee96 (code outside .kerjaan/); the latest test run passed on exactly this content.

- 2026-10-28: Reviewed at level quick, round 1, at commit 427738b: passed.
  Level quick di sini: uji proyek tidak dijalankan ulang, karena `test-run.sh --check 261028120601 427738b` menjawab SAME (jalan uji 2026-10-28 16:45:55 keluar 0 pada sidik 7046c869ec197c722d8beadb5da52b1543fa4d54, isinya persis yang ditinjau); perubahan `git diff ec241cf...427738b` (6 berkas di `viewer/`) dibaca butir demi butir terhadap Done when. Tidak ada server yang dinyalakan, tidak ada sabotase.
  - Butir 1 (alat berjalan → langkah dan lamanya): terpenuhi. `viewer/agents.mjs` menyimpan panggilan yang belum dijawab di `open`; ada yang terbuka → `phase: 'tool'`, `phaseAt` = waktu langkah terakhir. `agentPhase` di `viewer/web/agent.js` menampilkan "<langkah> · running N". Diuji di `agents.test.mjs` dan uji peramban kartu/laci (`running \d+ s`).
  - Butir 2 (di antara langkah → berpikir atau menulis dan lamanya): terpenuhi. Semua panggilan terjawab → `phase: 'thinking'` sejak jawaban terakhir; kartu "thinking or writing · for N", miring. Diuji di uji peramban "card: turns from the running step…".
  - Butir 3 (berganti sendiri dalam beberapa detik, tanpa memuat ulang): terpenuhi. Uji peramban yang sama menambah baris ke catatan agen dan menunggu kartu berganti ke "thinking or writing", lalu ke langkah baru, lalu kembali, tiap kali di bawah 6 detik, dengan penanda `window.__kept` yang membuktikan halaman tidak dimuat ulang.
  - Butir 4 (isi pikiran, pesan, hasil alat tidak tampil): terpenuhi. Dari baris `user` hanya `tool_use_id` yang dibaca; uji peramban memastikan teks `SECRET-RESULT-*`/`SECRET-COMMAND-*` tidak ada di halaman.
  - Butir 5 (agen berhenti tetap ditandai berhenti): terpenuhi. Server memberi `phase: null` bila `ended`; halaman juga menolak fase bila nada `stopped` (senyap). Diuji di "an agent that has stopped is marked so…" dan di ujung uji peramban untuk agen gone/interrupted/finished/passed.
  - Butir 6: dicoret pemilik 28 Okt 2026; tidak dinilai.
  Catatan (tidak memblokir): warna kuning "quiet" tetap dihitung dari tanda hidup terakhir, jadi alat yang berjalan lebih dari 2 menit tampil kuning dengan "running N min" — keputusan pengerja yang tercatat di atas, masuk akal, dan bagian perintah panjang memang milik 261028112701.
  Tidak diverifikasi dengan menjalankan apa pun oleh peninjau: kelima butir dinilai dari membaca diff dan uji, ditambah jalan uji pengerja yang lulus (SAME).
- 2026-10-28 16:47:08: merge queue: joined as number 1, behind nobody.
