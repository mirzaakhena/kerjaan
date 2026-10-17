---
type: feature
priority: medium
review: normal
labels: [sesi-8e6130e0, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 19:34:30
updated: 2026-10-17 19:59:19
related: [261006121501]
blocked_by: []
---

## Background
Viewer papan hanya bisa dibuka dari Mac yang menjalankannya, di alamat seperti http://127.0.0.1:4322/<nama-repo>/. Pemilik ingin memantau papan dari HP-nya, yang tersambung ke Wi-Fi yang sama, tanpa harus kembali ke Mac.

## Request
Saat viewer dijalankan dengan pilihan tambahan untuk jaringan, papan bisa dibuka dari perangkat lain di jaringan yang sama, dan viewer mencetak alamat yang bisa diketik di HP. Tanpa pilihan itu, viewer tetap hanya bisa dibuka dari Mac itu sendiri, seperti sekarang. Tidak ada kunci atau kata sandi: siapa pun di jaringan yang sama bisa membuka papan selama pilihan itu aktif.

## Done when
- [ ] Viewer yang dijalankan dengan pilihan jaringan bisa dibuka dari HP di Wi-Fi yang sama, lengkap dengan kanban, laci tiket, dan pembaruan langsung saat papan berubah — menunggu pemilik: skenario tangan di Notes
- [x] Saat pilihan jaringan aktif, viewer mencetak alamat untuk perangkat lain (alamat IP Mac di jaringan itu), selain alamat untuk Mac sendiri
- [x] Saat pilihan jaringan aktif, viewer mencetak peringatan singkat bahwa siapa pun di jaringan yang sama bisa membaca papan
- [x] Tanpa pilihan jaringan, perangkat lain tetap tidak bisa membuka viewer
- [ ] Halaman viewer pas dan terbaca di layar HP tanpa harus digeser ke samping — menunggu pemilik: skenario tangan di Notes (lebar HP di peramban uji sudah terbukti)
- [x] Cara menjalankannya untuk HP tertulis di README dan di bagian viewer pada skill

## History
- 2026-10-17 19:34:30 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 19:47:08 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 19:47:23 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 19:57:53 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review
- 2026-10-17 19:59:19 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 done

## Notes
- 2026-10-17: lahir dari permintaan pemilik di sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`): "saya ingin bisa akses via HP, yang mana HP ini masih di network yang sama dengan macbook ini". Keputusan pemilik lewat pilihan: diaktifkan dengan opsi `--lan` (bawaan tetap 127.0.0.1); tanpa pengaman (tidak ada kunci di alamat); dikerjakan sekarang, berdampingan dengan 261017113002. Viewer tetap hanya-baca. Pemilik juga meminta tidak ada bahasa Indonesia di skill: semua teks baru (pesan server, README, nama opsi) berbahasa Inggris.
- 2026-10-17 19:34:54: files estimated to change: `README.md`, `skills/kerjaan/SKILL.md`, `viewer/server.mjs`, `viewer/uji/peramban.test.mjs`, `viewer/uji/server.test.mjs`, `viewer/web/gaya.css`
- 2026-10-17 19:34:55: answered question: Butir Done when 1 (papan terbuka dari HP di Wi-Fi yang sama) dan sebagian butir 5 (pas di layar HP) hanya bisa dipastikan dengan HP sungguhan. Peninjau bisa membuktikan sendiri bahwa viewer menerima sambungan dari alamat jaringan Mac dan halaman pas di lebar layar HP pada peramban uji. Pilihan: (a) ditunda: pemilik mencobanya dari HP setelah tiket selesai, dan rantai jalan terus; (b) menahan rantai sampai pemilik mencobanya. Saran: (a), karena tidak ada tiket lain yang bergantung padanya dan pemilik bisa mencobanya kapan saja dengan satu perintah.
  answer, 2026-10-17 19:47:08: Pemilik: "Ditunda". (a) ditunda: pemilik mencobanya dari HP setelah tiket selesai, dan rantai jalan terus.
- 2026-10-17: dikerjakan (worker). `--lan` membuat viewer mendengar di 0.0.0.0; tanpa itu tetap 127.0.0.1. Alamat jaringan dan peringatan dicetak dari `viewer/lan.mjs` (IPv4 non-loopback, bukan 169.254.x.x, satu baris per antarmuka dengan nama, lengkap dengan jalur `--project`; tanpa alamat jaringan dicetak keterangan "no network address"). Teks baru semua berbahasa Inggris; baris lama yang berbahasa Indonesia di server.mjs dibiarkan (tiket lain). `runCli` dipindah dari server.test.mjs ke bantu.mjs agar dipakai bersama. gaya.css tidak perlu diubah: tata letak HP sudah pas (diukur, lihat uji di bawah).
- Keputusan: SKILL.md membayar kalimat `--lan` dengan membuang dua kalimat ("`order.md` and `settings.md` hold what no folder can", "Everything else in the tree stays as it was"); anggaran 17959/18000 setelah gabung main.
- Diketahui, tidak diubah: di macOS, viewer `--lan` tetap menyala walau viewer tanpa `--lan` sudah memakai porta yang sama (SO_REUSEADDR); HP tetap dapat papan, Mac dilayani yang lama. Tidak berbahaya, isinya sama.
- Uji baru `viewer/uji/lan.test.mjs`: pemilihan alamat per jenis antarmuka; baris yang dicetak (ada alamat / tidak ada); perintah `--lan` di dua urutan argumen (`--lan` di depan, dan `--port 0 --lan` di belakang) mencetak alamat 127.0.0.1, setiap alamat jaringan dengan `/alpha/`, peringatan, dan lewat setiap alamat jaringan melayani kanban, isi tiket, POST ditolak 405, dan kabar perubahan (SSE); Chrome selebar HP 360×740 dan 390×844 lewat alamat jaringan Mac: beranda, kanban (satu status, kartu di dalam layar, titik langsung menyala), laci tiket, order.md tanpa geser ke samping, dan laci serta kolom ikut berubah saat tiket dipindah; README dan SKILL.md menyebut `--lan`. Uji lama 'perintah: ... 127.0.0.1' tetap membuktikan butir 4 (porta tertutup di setiap alamat non-loopback).
- Dirusak dengan sengaja, lalu dipulihkan dari salinan: host selalu 0.0.0.0 → uji 'perintah ... 127.0.0.1' merah; host `--lan` 127.0.0.1 → kedua uji perintah `--lan` dan kedua uji HP merah; cetak baris `--lan` dihapus → kedua uji perintah merah; peringatan dihapus → uji baris + kedua uji perintah merah; syarat IPv4 / bukan internal / bukan 169.254 masing-masing dihapus → uji alamat merah; keterangan "tidak ada alamat" dihapus → uji baris merah; alamat lengkap dihapus dari baris → merah; jalur proyek dihapus dari alamat → kedua uji perintah merah; `--lan` dihapus dari SKILL.md, perintah dan peringatan dari README masing-masing → uji dokumen merah; media query layar sempit (860px) dimatikan → kedua uji HP merah.
- Skenario tangan (butir 1 dan 5, HP sungguhan): 1. Di Mac, dari folder repo: `node viewer/server.mjs --scan ~/Workspace --port 4321 --lan` (bila viewer lain sudah memakai 4321, hentikan dulu). 2. Bila macOS bertanya apakah `node` boleh menerima sambungan masuk, izinkan. 3. Salin alamat di baris "from a phone or another device on the same network (en0): http://<IP>:4321/" dan pastikan ada baris "warning: --lan is on ...". 4. Di HP yang tersambung ke Wi-Fi yang sama, buka alamat itu: halaman depan menampilkan kartu proyek, tanpa geser ke samping. 5. Ketuk proyek `kerjaan`: kanban tampil satu status sekaligus dengan tombol status di atasnya, titik "langsung" hijau. 6. Ketuk sebuah kartu: laci tiket terbuka dan terbaca tanpa geser ke samping. 7. Di Mac, pindahkan sebuah tiket (misalnya `update-ticket.sh <id> --status todo` pada tiket backlog): dalam beberapa detik HP ikut berubah tanpa dimuat ulang. 8. Hentikan viewer, jalankan tanpa `--lan`, muat ulang di HP: halaman tidak bisa dibuka.
- 2026-10-17 19:57:48: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 3m6s, on content fingerprint 67f33eaa15b3cff6aa1506952e38cc0cd767474c (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 19:57:53: review covers branch tiket-261017193401 at 3c91de64100306e56d2513f3813925c654c1af69, which holds main at 661203fa044dd6f4240fae664f22c091ecf1d0ed (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-17: Reviewed at level normal, round 1, at commit 3c91de6: passed.
  Pada level normal: uji proyek dibawa dari run worker (sama persis isinya), setiap butir dibuktikan dengan menjalankan viewer sungguhan dari worktree `kerjaan-lan` dan mencobanya dengan `curl`/`lsof`, dan uji baru dibaca untuk assertion yang tidak bisa gagal. Tidak perlu salinan bersih: tree worktree tidak bergerak.
  - Uji: `test-run.sh --check 261017193401 3c91de6` → SAME, run 2026-10-17 19:57:48, fingerprint 67f33eaa15b3cff6aa1506952e38cc0cd767474c, `node --test --test-timeout=900000 --test-force-exit` exit 0; tidak dijalankan ulang.
  - Butir 1 (dibuka dari HP sungguhan): menunggu pemilik. Keputusan pemilik "Ditunda" tercatat 2026-10-17 19:47:08; skenario tangan 8 langkah ada di Notes dan berakhir pada apa yang harus terlihat. Bagian yang bisa dibuktikan mesin sudah terbukti: lewat alamat jaringan Mac (`http://10.193.2.92:4321/kerjaan/`) halaman menjawab 200, `api/papan` mengembalikan papan, POST ditolak 405 (tetap hanya-baca); uji `lan.test.mjs` juga membuktikan laci tiket dan kabar perubahan (SSE) lewat alamat jaringan.
  - Butir 2 (alamat untuk perangkat lain): `node viewer/server.mjs --scan ~/Workspace --project kerjaan --port 4321 --lan` mencetak `kerjaan viewer: http://127.0.0.1:4321/kerjaan/` lalu `from a phone or another device on the same network (en0): http://10.193.2.92:4321/kerjaan/`; `ipconfig getifaddr en0` = 10.193.2.92. `lsof` menunjukkan `TCP *:4321 (LISTEN)`. Ini sekaligus membuktikan `--port 4321 --lan` berjalan.
  - Butir 3 (peringatan): perintah yang sama mencetak `warning: --lan is on, so anyone on the same network can read every board shown here, without a password`.
  - Butir 4 (tanpa pilihan, perangkat lain tidak bisa membuka): tanpa `--lan` di porta 4391, `lsof` menunjukkan `TCP 127.0.0.1:4391 (LISTEN)`; `curl http://127.0.0.1:4391/kerjaan/` → 200, `curl http://10.193.2.92:4391/kerjaan/` → gagal tersambung (exit 7).
  - Butir 5 (pas di layar HP): menunggu pemilik untuk HP sungguhan; keputusan dan skenario tangan ada (langkah 4 dan 6). Uji Chrome 360×740 dan 390×844 lewat alamat jaringan memeriksa scrollWidth beranda, kanban, laci dan order.md — bukan assertion kosong; termasuk dalam run yang dibawa.
  - Butir 6 (README dan skill): README bagian viewer memberi perintah `--lan`, alamat untuk HP, peringatan, dan catatan izin macOS; SKILL.md bagian viewer: "For a phone on the same Wi-Fi, add `--lan`; hand over its network address and warning." Semua teks baru berbahasa Inggris.
  - Uji dibaca: `lan.test.mjs` memeriksa nilai nyata (alamat per antarmuka, baris tercetak, isi papan, 405, SSE, lebar halaman). Catatan: uji perintah `--lan` dan uji butir 4 di `server.test.mjs` hanya bermakna di mesin yang punya alamat jaringan; tanpa Wi-Fi loopnya kosong (uji HP melewati diri dengan alasan, uji butir 4 diam saja). Di mesin ini ada alamat, jadi buktinya berlaku.
  - SKILL.md, dua kalimat yang dibuang: "Everything else in the tree stays as it was" hanya menjelaskan akibat commit dengan pathspec, bukan aturan; "`order.md` and `settings.md` hold what no folder can" menjelaskan kenapa dua berkas itu bukan pelanggaran larangan menulis indeks, dan keduanya tetap diperkenalkan di diagram pohon (baris 61-62) dan di bagian masing-masing. Tidak ada aturan yang hilang; catatan saja.
  - Catatan (tidak memblokir): di macOS viewer `--lan` bisa menyala di porta yang sudah dipakai viewer tanpa `--lan` (diakui worker). Akibatnya petunjuk skill "If the port is in use, one is already running" tidak berlaku untuk `--lan`: bisa ada dua viewer di porta yang sama tanpa ada yang tahu.

### Suggested follow-up

- **Viewer `--lan` diam-diam berbagi porta dengan viewer lama di macOS.** Bila viewer tanpa `--lan` sudah berjalan di 4321, menjalankan yang `--lan` di porta sama tidak gagal; Mac dilayani yang lama, HP yang baru, dan tidak ada pesan. Layak tiket: viewer menolak menyala (atau memberi tahu) bila porta itu sudah dipakai di alamat mana pun.
- **Uji jaringan kosong di mesin tanpa Wi-Fi.** Uji butir "tanpa pilihan jaringan" dan uji perintah `--lan` lolos tanpa memeriksa apa pun bila mesin tak punya alamat jaringan. Layak tiket: laporkan sebagai dilewati (skip dengan alasan), bukan lolos.
