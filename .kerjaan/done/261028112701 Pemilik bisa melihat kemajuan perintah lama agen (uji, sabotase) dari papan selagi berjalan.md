---
type: feature
priority: medium
review: strict
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 11:27:23
updated: 2026-10-28 17:06:01
related: [261016084202, 261017155801, 261028102201, 261028121401]
blocked_by: []
---

## Background
Papan di peramban sudah menunjukkan langkah terakhir agen pada tiap tiket
(261016084202): misalnya "● worker · Menjalankan uji · 12 dtk lalu". Tapi
sebagian besar waktu pengerja habis di satu langkah yang lama: jalan uji
proyek, atau skrip yang membuang penjaga satu per satu untuk membuktikan
ujinya bisa merah. Satu langkah seperti itu bisa berjalan tujuh menit atau
lebih. Selama itu papan hanya menunjukkan langkah yang sama dengan waktu yang
terus bertambah, jadi agen yang sedang menguji tampak sama dengan agen yang
macet.

Catatan langkah agen baru memuat hasil sebuah perintah sesudah perintah itu
selesai, jadi papan tidak bisa membaca kemajuannya dari sana. Papan juga
sengaja tidak pernah menampilkan isi perintah atau hasilnya, karena bisa
memuat rahasia (261016084202, 261017155801).

Pemilik (28 Okt 2026) sering gelisah menunggu pengerja dan ingin yakin
pengerja benar-benar bekerja: melihat log uji yang sedang berjalan, atau
hijau/merah tiap uji, dari papan.

## Request
Selagi agen menjalankan jalan uji lewat jalur uji kerjaan (jalan uji pengerja,
dan setiap jalan uji peninjau termasuk sabotase), pemilik bisa membuka
kemajuannya dari kartu tiket di papan, di bagian Kemajuan pada laci kanan
tiket, dan melihatnya bergerak sendiri: keluaran
terbarunya, berapa lama sudah berjalan, kapan terakhir ada keluaran, dan bila
keluarannya berbentuk hasil uji, berapa yang hijau dan merah (daftar ujinya
satu per satu: 261028121401).

Untuk uji, pemilik tidak cukup hanya melihat jumlah hijau dan merah: ia ingin
melihat daftar ujinya satu per satu, yaitu apa yang diuji oleh masing-masing
uji, uji mana yang sedang berjalan, mana yang sudah hijau atau merah, dan
berapa lama masing-masing. Ini harus berlaku di proyek mana pun yang memakai
papan, bukan hanya di proyek yang kebetulan memakai satu alat uji tertentu.
Setiap uji yang dibuat harus melaporkan dirinya ke papan selagi berjalan, dan
harus ada jaminan bahwa uji yang tidak melapor tidak bisa lolos diam-diam.
Tiket ini memuat bagian pertama: kemajuan perintah itu sendiri. Daftar uji
satu per satu ada di 261028121401; jaminannya dibatalkan pemilik
(261028121402). Kemajuan hanya terlihat selagi tiket di in_progress atau
review; jalan uji yang sudah selesai tidak disimpan.

## Done when
- [x] Selagi pengerja menjalankan uji proyek, kartu tiketnya punya tombol yang membuka bagian Kemajuan di laci kanan tiket
- [x] Kemajuan menampilkan baris-baris keluaran terbaru dan bertambah sendiri tanpa memuat ulang halaman
- [x] Kemajuan menunjukkan sudah berapa lama perintah berjalan dan berapa detik sejak keluaran terakhir, sehingga perintah yang macet terlihat berbeda dari yang bekerja
- [ ] ~~Bila keluarannya berbentuk hasil uji yang dikenali, kemajuan menunjukkan jumlah hijau dan merah sejauh ini~~ (pindah ke 261028121401)
- [x] Hal yang sama berlaku untuk jalan uji peninjau, termasuk sabotase, bukan hanya jalan uji pengerja
- [ ] ~~Sesudah perintah selesai, hasil akhirnya (lulus atau gagal, lama berjalan) tetap bisa dibuka dari tiket~~ (dibatalkan pemilik 28 Okt 2026: jalan uji tidak disimpan, hanya dilihat selagi tiket di in_progress atau review; ringkasan lulus/gagal tetap tercatat di Notes oleh test-run.sh)
- [x] Rahasia yang mungkin ada di keluaran diperlakukan sesuai keputusan pemilik (lihat Notes)
- [ ] ~~Pemilik melihat kemajuan sebuah uji yang sedang berjalan dari papan (langkah di Notes)~~ (dibatalkan pemilik 28 Okt 2026: butir yang hanya bisa dicek orang dihapus)
- [ ] ~~Selagi uji proyek berjalan, papan menampilkan daftar uji satu per satu: apa yang diuji masing-masing, yang sedang berjalan, yang sudah hijau atau merah, dan lama masing-masing, bertambah sendiri~~ (pindah ke 261028121401)
- [ ] ~~Hal itu berlaku di proyek mana pun yang memakai papan, apa pun alat ujinya, dan cara sebuah proyek ikut melapor tertulis di panduan~~ (pindah ke 261028121401)
- [ ] ~~Uji baru yang tidak melapor ke papan membuat jalan uji gagal atau ditolak peninjau, sehingga tidak ada uji yang lolos tanpa terlihat di papan~~ (dibatalkan pemilik bersama 261028121402)

## History
- 2026-10-28 11:27:23 2894605e-2452-4259-b7ae-7187f1df18cb backlog
- 2026-10-28 12:47:44 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 16:32:33 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 16:58:34 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 17:05:29 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup, sambil menunggu pengerja tiket POC tarif. Usulnya sendiri: SSE ke web, terpadu dengan papan, tombol untuk melihat log atau hijau/merah tiap uji. Viewer sudah memakai SSE (`viewer/app.mjs`).
- Akar teknisnya (dibaca dari `viewer/agents.mjs`, belum diukur): catatan agen Claude Code memuat hasil perintah hanya sesudah selesai, jadi kemajuan harus datang dari tempat lain — keluaran perintah yang ditulis ke berkas selagi berjalan, yang dibaca viewer. Itu berarti perintah lama agen harus lewat satu jalur yang mencatat keluarannya (`test-run.sh` untuk uji; untuk perintah lain perlu jalur serupa). Berkas itu bukan status, jadi tempatnya di luar `.kerjaan/` (aturan "no status summary in .kerjaan/").
- Kait dengan 261028102201 (agen menjalankan perintah lama di latar depan, bukan latar + perulangan): jalur pencatat yang sama bisa jadi cara yang diwajibkan untuk perintah lama, jadi kedua tiket sebaiknya tidak saling bertabrakan.
- Hijau/merah tiap uji bergantung pada bentuk keluaran proyek. Usulan: kenali bentuk umum (TAP, `node --test`) dan sisanya tampil sebagai log saja. Proyek seperti nukitu-mockup sudah punya halaman log hidup sendiri (`npm run uji` mencetak alamatnya di baris pertama); menautkan alamat seperti itu bisa jadi bagian dari ini.
- Pertanyaan terbuka untuk Mirza (dicatat dengan `queue.sh ask`).
- 2026-10-28 11:27:52: answered question: Keluaran perintah selama ini tidak pernah tampil di papan karena bisa memuat rahasia. Untuk kemajuan perintah: tampilkan keluaran apa adanya (papan tetap hanya bisa dibuka dari komputer ini, dan dengan --lan siapa pun di jaringan itu), sembunyikan baris yang tampak seperti rahasia, atau tanpa log sama sekali (hanya lama berjalan, detik sejak keluaran terakhir, jumlah hijau/merah)?
  answer, 2026-10-28 11:28:43: Log apa adanya: keluaran tampil seperti di terminal. Papan hanya terbuka dari Mac ini; dengan --lan siapa pun di jaringan itu ikut membaca, dan papan sudah memperingatkannya.
- Diperluas atas permintaan mirza, 2026-10-28 (sesi a185f853-6a65-4f44-919d-97ba97774e43), kata-katanya: "untuk tiket 2701 khusus soal test, saya ingin bukan hanya 'berapa banyak yang green atau red' tetapi juga apa saja yang diuji untuk masing-masingnya. mirip seperti /Users/mirza/Workspace/nukitu-mockup/test/uji-ui.mjs tapi bisa dibuat lebih baik dan bisa berfungsi secara general untuk segala project. Intinya, setiap test yang dibuat harus menyertakan sse event sehingga bisa dibuka oleh viewer. Harus ada jaminan agar test selalu menyertakan sse event ini." Tiga butir terakhir Done when berasal dari sini.
- Contoh rujukan pemilik: `nukitu-mockup/test/uji-ui.mjs` dengan `test/laporan.mjs` dan `laporan-halaman.mjs`. Pelari uji itu melapor mulai/selesai tiap wilayah dan tiap uji ke log hidup (server HTTP sendiri di porta pilihan sistem, halaman di peramban, catatan di `test/log/`), dengan perkiraan jumlah uji dari run terakhir. Yang diminta: versi umum yang dibaca viewer kerjaan, bukan server per proyek.
- Dengan perluasan ini tiket memuat 11 butir, di atas batas 8: planner memecahnya per hasil.
- Dipecah oleh planner (28 Okt 2026, sesi a185f853-6a65-4f44-919d-97ba97774e43) per hasil: tiket ini tetap kemajuan perintah lama (log hidup, lama berjalan, hasil akhir); daftar uji satu per satu dan jumlah hijau/merah pindah ke 261028121401; jaminan bahwa uji yang tidak melapor membuat jalan uji gagal pindah ke 261028121402. Butir yang pindah dicoret di Done when.
- 2026-10-28 12:15:49: files estimated to change: `README.md`, `skills/kerjaan/scripts/test-run.sh`, `tests/test-run.test.mjs`, `viewer/app.mjs`, `viewer/runs.mjs`, `viewer/tests/helpers.mjs`, `viewer/tests/runs.test.mjs`, `viewer/web/drawer.js`, `viewer/web/project.js`, `viewer/web/run.js`, `viewer/web/style.css`
- 2026-10-28 12:16:48: answered question: Perintah lama mana saja yang kemajuannya tampil di papan? Saran: semua jalan uji yang lewat jalur uji kerjaan, yaitu jalan uji pengerja dan setiap jalan uji peninjau, termasuk sabotase (peninjau sudah wajib menjalankan sabotase lewat jalur itu), karena tidak perlu aturan baru untuk agen yang aturannya sudah hampir penuh; butir Done when ke-5 lalu ditulis ulang sebagai 'jalan uji peninjau, termasuk sabotase'. Pilihan lain: juga perintah lama apa pun di luar uji (memasang paket, build), yang butuh jalur baru dan aturan baru di ketiga definisi agen, sehingga aturan lain harus dipangkas dulu.
  answer, 2026-10-28 12:47:00: Semua jalan uji: setiap jalan uji lewat jalur uji kerjaan, yaitu jalan uji pengerja dan setiap jalan uji peninjau, termasuk sabotase. Tanpa aturan agen baru.
- 2026-10-28 12:16:48: answered question: Tombol di kartu membuka kemajuan di mana? Saran: di laci kanan tiket itu, langsung di bagian Kemajuan, karena pemilik sudah biasa membuka tiket di sana dan langkah agen sudah tampil di laci yang sama. Pilihan lain: halaman sendiri yang bisa dibuka di tab lain dan dibiarkan terbuka.
  answer, 2026-10-28 12:47:01: Laci tiket: bagian Kemajuan di laci kanan tiket.
- 2026-10-28 12:16:48: answered question: Berapa lama hasil sebuah jalan uji disimpan agar tetap bisa dibuka dari tiket? Saran: 10 jalan terakhir per tiket, tetap bisa dibuka sesudah tiket selesai, disimpan di folder git proyek (tidak ikut commit, tidak di .kerjaan/), karena cukup untuk melihat ronde tinjauan terakhir tanpa memenuhi disk. Pilihan lain: hanya jalan terakhir per tiket; atau semua jalan tanpa batas.
  answer, 2026-10-28 12:47:01: Tidak ada yang disimpan. jalan uji hanya dilihat saat status progress dan review.
- 2026-10-28 12:16:49: answered question: Butir 'Pemilik melihat kemajuan sebuah uji yang sedang berjalan dari papan' hanya bisa dicek orang. Saran: ditunda, yaitu pengerja menulis langkahnya sebagai skenario tangan dan rantai berjalan terus, karena tiket berikutnya tidak bergantung pada pengecekan ini. Pilihan lain: rantai berhenti sampai pemilik mengeceknya sendiri.
  answer, 2026-10-28 12:47:01: Hapus semua: setiap butir yang hanya bisa dicek orang dicoret, dibatalkan pemilik, tanpa skenario tangan.
- 2026-10-28 (pengerja, cabang ticket-261028112701): dikerjakan.
  - Jalur: `test-run.sh` (jalan pengerja dan setiap `--review`, termasuk sabotase) menyalin keluaran perintah ke `<git common dir>/kerjaan-progress/<id>.<pid>.log`, dengan `<id>.<pid>.json` (tiket, pid, `who` worker/reviewer, mulai, perintah). Keduanya dihapus saat jalan selesai, lulus atau gagal; salinan sisa proses yang mati dihapus jalan berikutnya. Di bawah `.git/`, jadi tidak ikut commit dan di luar sidik jari.
  - Kode keluar: salinan dibuat lewat process substitution di samping perintah, bukan pipa, jadi `$?` tetap milik perintah; stdout dan stderr tetap ke aliran masing-masing. Script menunggu salinan paling lama 5 dtk agar baris terakhir keluar sebelum baris catatannya; proses latar yang menahan keluaran tidak membuat jalan menggantung.
  - Viewer: `viewer/runs.mjs` membaca map itu (nama berkas hanya dari daftar map, pid harus hidup, isi .json harus cocok dengan namanya), 200 baris terakhir dari 64 KiB ujung, kode warna/kursor dibuang dan `\r` ditampilkan seperti terminal. Papan memuat `runs` (tanpa keluaran) untuk tiket in_progress/review; `api/progress/<id>` (ID 12 digit, harus tiket aktif) dan `api/ticket/<id>` memuat keluaran; SSE `progress` tiap 2 dtk saat ada perubahan.
  - Halaman: tombol Progress tergantung di bawah kartu (tombol tidak boleh di dalam tombol kartu): titik, lama berjalan, "output N s ago"; hijau < 1 mnt, kuning, merah sesudah 5 mnt tanpa keluaran. Tombol membuka laci di bagian Progress (digulir ke sana, fokus di sana); keluaran mengikuti ujung kecuali digulir ke atas; waktu diperbarui tiap detik tanpa menggambar ulang keluaran. Daftar uji 261028121401 bisa masuk per jalan di `runPart` (`viewer/web/run.js`).
  - Rahasia: keluaran tampil apa adanya sesuai jawaban pemilik; README menyebut bahwa isinya ada di halaman dan, dengan `--lan`, di jaringan.
  - Penjaga yang dirusak dan uji yang merah (semua dikembalikan dari salinan): kode keluar di jalur salinan (`return 0`) -> 3 uji "a failing run stays failed"; kode keluar di jalur tanpa salinan -> "copy cannot be made"; penghapusan salinan -> uji pengerja, peninjau, dan sisa proses mati; stderr ke stdout -> uji pengerja; pembersihan sisa mati (dua arah) -> uji sisa; batas tunggu 5 dtk -> "leaves behind"; `who` peninjau dan salinan jalan peninjau -> uji peninjau; cek pid hidup, cek tiket di .json, saring ID, buang kode ANSI, `\r`, tanda potong, buang baris setengah, `.git` berkas worktree -> uji runs.mjs masing-masing; keluaran di papan, saring tiket aktif di api/progress dan api/ticket, regex ID -> uji server; event SSE -> uji live; escape keluaran, ambang kuning/merah, baris potong -> uji tampilan; tombol kartu, scrollIntoView, fokus, ikut ujung, tetap saat digulir, ambil ulang, hilang saat jalan selesai, waktu di laci, fokus saat dibuka dari kartu -> uji peramban.
  - Saring status aktif dipasang di dua tempat (`runsOf` hanya ID aktif, dan `boardSummary` per status); merusak satu saja tetap hijau karena yang lain menahan, merusak keduanya -> uji kanban merah.
- 2026-10-28 16:58:00: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` exited 0 after 3m52s, on content fingerprint 2f90190eaa8dfd1f4fb7b37b061755e3365fec78 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28 16:58:34: review covers branch ticket-261028112701 at 60d22824a0e71a670f0ccd15350f8613b058f15a, which holds main at ed456777cb607a3e820cddf56f0235e7988bc155 (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-28: Reviewed at level strict, round 1, at commit 60d2282: passed.
  Level strict di sini: jalan uji pengerja dibawa (SAME), tiap butir dibuktikan dengan menjalankan sesuatu, uji dibaca, peninjauan di salinan bersih `git archive 60d2282`, dan enam penjaga dirusak dengan sengaja di salinan masing-masing.
  - Jalan uji: `test-run.sh --check 261028112701 60d2282` -> SAME: jalan 2026-10-28 16:58:00, `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` keluar 0, sidik jari 2f90190eaa8dfd1f4fb7b37b061755e3365fec78. Tidak dijalankan ulang. Di salinan bersih, `tests/test-run.test.mjs` dan `viewer/tests/runs.test.mjs` (termasuk uji peramban, tidak ada yang dilewati): 35/35 lulus.
  - Dibuktikan ujung ke ujung di repo buatan di /tmp dengan `test-run.sh` dan viewer dari salinan bersih: selagi jalan uji pengerja (perintah 6 dtk, keluar 4) berjalan, `api/board` membawa `runs` tanpa keluaran, `api/progress/<id>` membawa baris-baris terbaru (stdout dan stderr), SSE `progress` mengirim ukuran yang bertambah; sesudahnya kode keluar tetap 4, stdout dan stderr tetap di alirannya masing-masing, catatan Notes "exited 4", map `kerjaan-progress` kosong, `api/progress` -> `{"runs":[]}`. Jalan peninjau (`--review ... -- <perintah>`, keluar 9) dari worktree tertaut: tampil sebagai `who: reviewer` di viewer proyek utama, kode warna dibuang, keluar 9, berkas dihapus. `api/progress/..%2F..%2Fetc` -> 404.
  - Butir 1 (tombol di kartu membuka Kemajuan): uji peramban 1280x800 dan 390x844 lulus di salinan bersih; tombol di bawah kartu, laci terbuka di bagian Progress yang terlihat dan terfokus.
  - Butir 2 (baris terbaru, bertambah sendiri): uji peramban (baris baru muncul tanpa muat ulang, `window.__kept` tetap) dan SSE di atas.
  - Butir 3 (lama berjalan, detik sejak keluaran terakhir, macet tampak berbeda): uji tampilan dan peramban (hijau/kuning/merah, "output 10 min ago" merah pada jalan yang diam).
  - Butir 5 (jalan peninjau, termasuk sabotase): jalan `--review` dengan perintah sendiri ujung ke ujung di atas, dan uji peninjau.
  - Butir 7 (rahasia sesuai keputusan pemilik): keluaran apa adanya sesuai jawaban 28 Okt; README menyebut keluaran tampil di halaman dan, dengan `--lan`, di jaringan. Keluaran di-escape (uji `<script>` lulus).
  - Kode keluar dan menggantung (alasan strict): salinan lewat process substitution, `$?` milik subshell perintah; diuji dengan /bin/bash 3.2 (bash di PATH). Tidak ada pipa yang statusnya bisa menggantikan perintah; tunggu salinan dibatasi 5 dtk.
  - Path dari permintaan: ID hanya dibandingkan dengan nama dari `readdirSync`, tidak pernah digabung ke path; ID harus 12 digit dan tiket aktif.
  - Sabotase (tiap satu di salinan sendiri, uji penjaganya saja):
    - `code=$(( $? != 0 ))` (status 7 jadi 1) -> 13 uji test-run merah.
    - tunggu salinan tanpa batas -> "a process the command leaves behind ... does not keep the run waiting" merah.
    - salinan stderr dikirim ke stdout -> uji jalan pengerja merah.
    - `alive()` selalu benar (jalan mati tampil) -> 6 uji runs merah.
    - `runsMark` tanpa ukuran (keluaran baru tidak diambil) -> 2 uji peramban merah.
    - saring tiket aktif di `api/progress` dibuang -> uji api/progress merah.
  - Catatan (tidak menghalangi): stdout dan stderr kini lewat dua `tee` terpisah, jadi urutan relatif keduanya di terminal gabungan bisa sedikit bergeser dari sebelumnya; pembersihan sisa hanya dipicu oleh `.json`, sehingga `.log` atau `.tmp` yatim (bila proses mati tepat di antara penulisan) tidak pernah dihapus; pid yang dipakai ulang membuat sisa jalan mati tampak hidup sampai jalan berikutnya.

### Suggested follow-up

- **Sisa berkas kemajuan yang yatim tidak pernah dibersihkan.** Bila `test-run.sh` dimatikan tepat sesudah membuat `.log` tetapi sebelum `.json` (atau meninggalkan `.tmp`), berkas itu tetap di `.git/kerjaan-progress/` selamanya karena pembersihan hanya melihat `*.json`. Layak satu tiket kecil: bersihkan juga `.log`/`.tmp` yang pid-nya sudah mati.
- 2026-10-28 17:05:29: merge queue: joined as number 2, behind nobody.
- 2026-10-28 17:06:01: landed on main as 359ff4dbfb71a8029896136fa35605c7cacf6b08, merging ticket-261028112701 at 60d22824a0e71a670f0ccd15350f8613b058f15a; tests carried from the run on this exact content, not run again.
