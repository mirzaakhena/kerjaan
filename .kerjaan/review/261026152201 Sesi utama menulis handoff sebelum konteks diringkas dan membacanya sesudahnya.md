---
type: feature
priority: high
review: normal
labels: [mandor, konteks]
reporter: mirza
assign_to: claude
created: 2026-10-26 15:22:13
updated: 2026-10-26 17:20:42
related: [261011064201, 261026150401]
blocked_by: [261026150401]
---

## Background
Sesi utama (mandor) memegang hal yang tidak ada di papan: agen pengerja dan peninjau mana yang sedang berjalan beserta ID-nya, antrean penggabungan yang sedang diatur, keputusan pemilik yang baru diberikan lewat percakapan, dan pengingat untuk pemilik. Saat konteks percakapan hampir penuh, percakapan diringkas otomatis, dan detail itu bisa hilang dari ringkasan. Di proyek video-system-design (26-10-2026), dengan belasan agen berjalan, mandor harus menulis catatan serah terima sendiri ke berkas di luar papan supaya bisa melanjutkan; tidak ada tempat atau aturan baku untuk itu.

## Request
Papan punya mekanisme serah terima sebelum konteks diringkas: saat pemakaian konteks mencapai batas yang diatur di setelan papan (bawaan 80%), sesi utama menulis berkas handoff.md di .kerjaan/ dengan format yang tetap. Begitu percakapan dilanjutkan setelah diringkas, sesi utama membaca berkas itu lebih dulu, melanjutkan pekerjaan dari isinya, lalu menghapusnya. Batas itu boleh berupa perkiraan: pengingat muncul di sekitar batas, boleh meleset beberapa persen. handoff.md tidak disimpan di git, dan untuk antrean penggabungan ia merujuk ke antrean yang tercatat di papan (261026150401), tidak menyalinnya.

## Done when
- [x] Setelan papan punya batas pemakaian konteks untuk menulis handoff, dengan bawaan 80% bila tidak diisi
- [ ] Saat batas tercapai (perkiraan, boleh meleset beberapa persen), sesi utama menulis .kerjaan/handoff.md dengan format tetap yang memuat setidaknya: agen yang sedang berjalan (tiket, peran, ID) dan apa yang ditunggu dari masing-masing, antrean penggabungan (sebagai rujukan ke antrean di papan), keputusan pemilik yang belum tercatat di tiket, pertanyaan yang menunggu pemilik, pengingat untuk pemilik, dan langkah berikutnya — menunggu mirza: skenario tangan di Notes
- [ ] Bila handoff.md sudah ada dan konteks masih bertambah, sesi utama memperbaruinya, bukan membuat berkas kedua — menunggu mirza: skenario tangan di Notes
- [ ] Setelah percakapan diringkas, sesi utama membaca handoff.md sebelum tindakan lain, melanjutkan dari isinya, lalu menghapusnya; berkas yang sudah dihapus tidak dibaca dua kali — menunggu mirza: skenario tangan di Notes
- [x] handoff.md tidak dianggap sebagai tiket, ringkasan status permanen, atau pengganti papan; pemeriksaan papan tidak menolaknya, pemeriksaan antrean mengabaikannya, dan git mengabaikannya
- [x] Panduan sesi utama dan penjelasan setelan menjelaskan kapan handoff ditulis, isinya, dan kapan dihapus
- [x] Skenario "batas tercapai → handoff ditulis → percakapan diringkas → handoff dibaca dan dihapus" diuji atau punya skenario tangan yang bisa diikuti pemilik

## History
- 2026-10-26 15:22:13 55ce84d0-5e6a-481d-a7c3-df4acf92bf37 backlog
- 2026-10-26 15:34:53 9be5acfb-f0e7-4547-926f-85a864635294 todo
- 2026-10-26 16:59:10 9be5acfb-f0e7-4547-926f-85a864635294 in_progress
- 2026-10-26 17:20:42 9be5acfb-f0e7-4547-926f-85a864635294 review
## Notes
- Permintaan mirza, 2026-10-26: "sepertinya mekanisme handoff juga perlu di buat untuk skill kerjaan … sebuah pesan khusus yang mungkin lokasinya setara dengan order.md dan settings.md yang menjelaskan hal-hal penting sebelum terjadi compacting … jika sudah mencapai n% yang didefinisikan dalam settings.md (defaultnya 80%) maka main agent harus membuat sebuah file bernama handoff.md. Seketika setelah terjadi compacting, main agent di sesi baru perlu membaca handoff.md … setelah itu dia harus menghapus file itu." Format berkas ditentukan saat pengerjaan.
- Catatan untuk pengerja (bukan keharusan): sesi utama tidak selalu tahu persentase konteksnya sendiri; periksa apa yang disediakan Claude Code (mis. hook sebelum ringkasan, hook saat sesi dimulai setelah ringkasan, atau info pemakaian konteks) untuk memicu penulisan dan pembacaan secara andal, bukan bergantung pada ingatan model.
- Aturan SKILL "jangan menulis ringkasan status ke .kerjaan/" perlu pengecualian yang jelas untuk handoff.md (berumur pendek, dihapus setelah dibaca).
- Contoh nyata isi yang dibutuhkan ada di video-system-design/_abaikan/serah-terima/SERAH-TERIMA.md bagian "Status 26-10 ±15:10".
- 2026-10-26 15:26:55: files estimated to change: `hooks/hooks.json`, `README.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/scripts/handoff.sh`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/SKILL.md`, `tests/handoff.test.mjs`
- 2026-10-26 15:27:09: answered question: Claude Code tidak memberi tahu sesi utama persentase konteksnya secara langsung, dan tidak ada pemicu tepat 'saat 80%'. Yang bisa dibuat: hook memperkirakan pemakaian konteks dari log percakapan lalu mengingatkan sesi utama untuk menulis handoff.md, dan sesaat setelah peringkasan hook menyuruhnya membaca berkas itu. Apakah 'batas tercapai' boleh berarti (a) pengingat muncul sekitar batas itu, berupa perkiraan yang bisa meleset beberapa persen, lalu sesi utama yang menulis berkasnya; atau (b) harus persis, dan bila tidak bisa, batas persen dihapus dan handoff ditulis hanya saat peringkasan sudah dekat? Saran: (a), karena hanya cara itu yang memberi sesi utama waktu menulis sebelum peringkasan terjadi, dan meleset beberapa persen tidak merugikan bila batasnya 80%.
  answer, 2026-10-26 15:34:33: (a) "Pengingat perkiraan" — pengingat di sekitar batas, boleh meleset beberapa persen.
- 2026-10-26 15:27:09: answered question: Apakah handoff.md disimpan di git? (a) tidak: berkas diabaikan git, karena umurnya pendek, dihapus setelah dibaca, dan hanya berlaku untuk sesi itu; (b) ya, di-commit seperti berkas papan lain. Saran: (a), karena commit tiap pembaruan dan penghapusan mengotori riwayat papan tanpa guna, dan berkas yang belum di-commit tidak menghalangi skrip papan.
  answer, 2026-10-26 15:34:33: (a) "Tidak, diabaikan git" — handoff.md tidak disimpan di git.
- 2026-10-26 15:27:10: answered question: Butir 2, 3 dan 4 (sesi utama sungguh menulis, memperbarui, lalu membaca dan menghapus handoff.md di sekitar peringkasan) hanya terbukti pada percakapan nyata yang diringkas; uji otomatis hanya bisa memeriksa pengingat, perintah membaca, dan papan yang mengabaikan berkas itu. Bagian nyata itu (a) ditunda: dicatat sebagai skenario tangan di Notes dan dicek pemilik pada sesi panjang berikutnya, dan tiket boleh lulus; atau (b) menahan rantai sampai pemilik melihatnya? Saran: (a), karena peringkasan nyata hanya terjadi di sesi yang panjang dan tidak bisa dipicu sesuka hati saat ditinjau.
  answer, 2026-10-26 15:34:34: (a) "Ditunda" — bagian nyata (kriteria 2–4) jadi skenario manual di Notes, dicek pada sesi panjang berikutnya; tiket bisa lulus.
- 2026-10-26 15:27:10: answered question: Isi handoff memuat 'antrean penggabungan', yang bentuknya baru ditentukan oleh 261026150401 (sudah di todo dan segera dikerjakan); keduanya juga mengubah panduan mandor, README dan pustaka skrip yang sama. Urutannya: (a) tiket ini menunggu 261026150401 selesai (blocked_by, grup sesudahnya), sehingga handoff merujuk ke antrean yang sudah tercatat di papan dan tidak menyalinnya; (b) berjalan berdampingan, 261026150401 digabung lebih dulu. Saran: (a), karena isi handoff untuk antrean bergantung pada hasil tiket itu, dan tiket yang menunggu hasil tiket lain tidak boleh satu grup dengannya.
  answer, 2026-10-26 15:34:34: (a) "Tunggu 261026150401" — tambah blocked_by: [261026150401], taruh di grup setelahnya; handoff merujuk antrean di papan, tidak menyalinnya.
- Catatan penyusun antrean untuk pengerja (2026-10-26): viewer dan skrip papan membaca tiket per folder status, jadi berkas di akar .kerjaan/ seperti handoff.md kemungkinan sudah diabaikan; butir 5 cukup dibuktikan dengan uji. Hook kerjaan ada di hooks/hooks.json; pemicu sesaat setelah peringkasan tersedia lewat hook SessionStart dengan source "compact". Teks skill harus berbahasa Inggris dan masuk anggaran kata (tests/english-only.test.mjs, tests/skill-size.test.mjs).
- Skenario manual (ditunda, kriteria 2–4): pada sesi panjang berikutnya, pemilik melihat bahwa sekitar batas setelan sesi utama mendapat pengingat dan menulis .kerjaan/handoff.md, memperbaruinya bila konteks terus bertambah, lalu setelah percakapan diringkas membacanya lebih dulu, melanjutkan dari isinya, dan menghapusnya.
- 2026-10-26: laporan pengerja.
  - Cara kerja: hook baru `handoff.sh` (didaftarkan di hooks.json pada UserPromptSubmit, PostToolUse semua alat, dan SessionStart source "compact"). Pemakaian konteks diperkirakan dari jawaban terakhir sesi utama di log percakapan (token masukan + cache + keluaran, dihitung ulang dari nol sesudah penanda peringkasan; jawaban subagen tidak dihitung). Pengingat muncul sekali saat mencapai `handoff_at`, lalu lagi tiap bertambah 5 poin, dengan perintah menulis ulang berkas yang sama. Sesudah peringkasan, isi handoff.md langsung dimasukkan ke konteks baru dengan perintah bertindak dulu lalu menghapusnya; berkas yang sama yang sudah pernah diserahkan disebut basi dan tidak diserahkan ulang.
  - Keputusan: ukuran jendela konteks tidak diberikan Claude Code, jadi urutannya `context_window` di settings.md, lalu CLAUDE_CODE_AUTO_COMPACT_WINDOW, lalu 200.000 bila CLAUDE_CODE_DISABLE_1M_CONTEXT=1, lalu 1.000.000 untuk model berjendela 1M (nama dari log) atau bila konteks sudah melewati 200.000, selain itu 200.000. Setelan baru `context_window` ditambahkan untuk sesi yang diringkas di ukuran lain (mis. /autocompact).
  - Keputusan (jawaban #2): git mengabaikan handoff.md lewat `.git/info/exclude` milik repo (tidak pernah di-commit), ditambahkan hook sebelum menyuruh menulis dan saat menyerahkan; tidak menambah berkas papan yang harus di-commit.
  - Berkas di luar perkiraan: `skills/kerjaan/scripts/queue.sh` (queue.sh check melaporkan nilai `handoff_at`/`context_window` yang tak terbaca) dan `skills/kerjaan/references/parallel-work.md` (dipangkas untuk anggaran kata). Anggaran kata kini 17.998 dari 18.000: kalimat alasan yang berulang dipangkas di SKILL.md (in_progress sebelum perubahan, contoh tiket buruk, jawaban tidak ditulis ke berkas), foreman.md (persetujuan pemilik, level tinjauan, tumpang tindih worktree) dan parallel-work.md.
  - Penjaga yang sengaja dirusak, dan uji yang memerah (tests/handoff.test.mjs): batas persen dinaikkan → uji batas bawaan dan tiap setelan; jeda 5 poin dihapus → uji pengingat berulang; lewati subagen dihapus → uji subagen; reset di penanda peringkasan → uji pemakaian sebelum ringkasan; saring subagen di log → uji jawaban subagen; cek source compact → uji sesi baru/lanjut/clear; cek berkas basi → uji berkas basi; reset pengingat saat compact → uji pengingat pertama lagi; ignore saat mengingatkan / saat menyerahkan → dua uji git; deteksi model 1M → delapan uji model 1M; lewat 200.000 / variabel jendela / DISABLE_1M → uji jendela; cabang "berkas sudah ada" → uji tulis ulang dan uji skenario; berkas panjang → uji berkas panjang; validasi handoff_at (>100, 0) dan context_window di lib.sh serta pemanggilannya di queue.sh → uji queue.sh check; bawaan 80 → uji bawaan.
  - Skenario tangan (kriteria 2–4, ditunda sesuai jawaban #3):
    1. Pasang plugin kerjaan versi ini, buka repo dengan papan, dan untuk sementara tulis `handoff_at: 10` di `.kerjaan/settings.md` supaya batas cepat tercapai.
    2. Mulai `claude` di repo itu, minta sesi membaca beberapa berkas besar (mis. README.md dan semua panduan di skills/kerjaan/references/) sampai konteks sekitar 10%.
    3. Yang terlihat: pesan "kerjaan: context at about N% — write handoff.md.", lalu sesi menulis `.kerjaan/handoff.md` dengan enam judul (Agents running, Merge queue, Owner decisions not yet in a ticket, Questions waiting for the owner, Reminders for the owner, Next steps), bagian Merge queue merujuk ke `merge.sh queue`. `git status` tidak menampilkan berkas itu.
    4. Lanjutkan membaca sampai sekitar 5 poin lagi. Yang terlihat: pesan "update handoff.md", berkas yang sama ditulis ulang, dan `ls .kerjaan` tetap hanya menunjukkan satu handoff.md.
    5. Jalankan `/compact`. Yang terlihat: sebelum hal lain, sesi menyebut isi handoff dan melanjutkan darinya, lalu menghapus berkasnya; `ls .kerjaan/handoff.md` menjawab tidak ada.
    6. Jalankan `/compact` sekali lagi. Yang terlihat: tidak ada apa pun tentang handoff.
    7. Kembalikan `handoff_at` ke nilai semula.
- 2026-10-26 17:20:33: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` exited 0 after 3m53s, on content fingerprint ffa89f4b0adb9382d20e8388a2ce0f863d800b60 (the same before and after the run; .kerjaan/ left out).
