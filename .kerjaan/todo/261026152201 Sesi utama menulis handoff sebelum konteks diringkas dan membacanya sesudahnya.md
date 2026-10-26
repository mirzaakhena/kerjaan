---
type: feature
priority: high
review: normal
labels: [mandor, konteks]
reporter: mirza
assign_to: claude
created: 2026-10-26 15:22:13
updated: 2026-10-26 15:34:53
related: [261011064201, 261026150401]
blocked_by: [261026150401]
---

## Background
Sesi utama (mandor) memegang hal yang tidak ada di papan: agen pengerja dan peninjau mana yang sedang berjalan beserta ID-nya, antrean penggabungan yang sedang diatur, keputusan pemilik yang baru diberikan lewat percakapan, dan pengingat untuk pemilik. Saat konteks percakapan hampir penuh, percakapan diringkas otomatis, dan detail itu bisa hilang dari ringkasan. Di proyek video-system-design (26-10-2026), dengan belasan agen berjalan, mandor harus menulis catatan serah terima sendiri ke berkas di luar papan supaya bisa melanjutkan; tidak ada tempat atau aturan baku untuk itu.

## Request
Papan punya mekanisme serah terima sebelum konteks diringkas: saat pemakaian konteks mencapai batas yang diatur di setelan papan (bawaan 80%), sesi utama menulis berkas handoff.md di .kerjaan/ dengan format yang tetap. Begitu percakapan dilanjutkan setelah diringkas, sesi utama membaca berkas itu lebih dulu, melanjutkan pekerjaan dari isinya, lalu menghapusnya. Batas itu boleh berupa perkiraan: pengingat muncul di sekitar batas, boleh meleset beberapa persen. handoff.md tidak disimpan di git, dan untuk antrean penggabungan ia merujuk ke antrean yang tercatat di papan (261026150401), tidak menyalinnya.

## Done when
- [ ] Setelan papan punya batas pemakaian konteks untuk menulis handoff, dengan bawaan 80% bila tidak diisi
- [ ] Saat batas tercapai (perkiraan, boleh meleset beberapa persen), sesi utama menulis .kerjaan/handoff.md dengan format tetap yang memuat setidaknya: agen yang sedang berjalan (tiket, peran, ID) dan apa yang ditunggu dari masing-masing, antrean penggabungan (sebagai rujukan ke antrean di papan), keputusan pemilik yang belum tercatat di tiket, pertanyaan yang menunggu pemilik, pengingat untuk pemilik, dan langkah berikutnya
- [ ] Bila handoff.md sudah ada dan konteks masih bertambah, sesi utama memperbaruinya, bukan membuat berkas kedua
- [ ] Setelah percakapan diringkas, sesi utama membaca handoff.md sebelum tindakan lain, melanjutkan dari isinya, lalu menghapusnya; berkas yang sudah dihapus tidak dibaca dua kali
- [ ] handoff.md tidak dianggap sebagai tiket, ringkasan status permanen, atau pengganti papan; pemeriksaan papan tidak menolaknya, pemeriksaan antrean mengabaikannya, dan git mengabaikannya
- [ ] Panduan sesi utama dan penjelasan setelan menjelaskan kapan handoff ditulis, isinya, dan kapan dihapus
- [ ] Skenario "batas tercapai → handoff ditulis → percakapan diringkas → handoff dibaca dan dihapus" diuji atau punya skenario tangan yang bisa diikuti pemilik

## History
- 2026-10-26 15:22:13 55ce84d0-5e6a-481d-a7c3-df4acf92bf37 backlog
- 2026-10-26 15:34:53 9be5acfb-f0e7-4547-926f-85a864635294 todo
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
