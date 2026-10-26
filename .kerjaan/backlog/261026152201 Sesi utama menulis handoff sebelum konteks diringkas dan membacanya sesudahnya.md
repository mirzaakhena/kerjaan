---
type: feature
priority: high
review: normal
labels: [mandor, konteks]
reporter: mirza
assign_to: claude
created: 2026-10-26 15:22:13
updated: 2026-10-26 15:22:13
related: [261011064201, 261026150401]
blocked_by: []
---

## Background
Sesi utama (mandor) memegang hal yang tidak ada di papan: agen pengerja dan peninjau mana yang sedang berjalan beserta ID-nya, antrean penggabungan yang sedang diatur, keputusan pemilik yang baru diberikan lewat percakapan, dan pengingat untuk pemilik. Saat konteks percakapan hampir penuh, percakapan diringkas otomatis, dan detail itu bisa hilang dari ringkasan. Di proyek video-system-design (26-10-2026), dengan belasan agen berjalan, mandor harus menulis catatan serah terima sendiri ke berkas di luar papan supaya bisa melanjutkan; tidak ada tempat atau aturan baku untuk itu.

## Request
Papan punya mekanisme serah terima sebelum konteks diringkas: saat pemakaian konteks mencapai batas yang diatur di setelan papan (bawaan 80%), sesi utama menulis berkas handoff.md di .kerjaan/ dengan format yang tetap. Begitu percakapan dilanjutkan setelah diringkas, sesi utama membaca berkas itu lebih dulu, melanjutkan pekerjaan dari isinya, lalu menghapusnya.

## Done when
- [ ] Setelan papan punya batas pemakaian konteks untuk menulis handoff, dengan bawaan 80% bila tidak diisi
- [ ] Saat batas tercapai, sesi utama menulis .kerjaan/handoff.md dengan format tetap yang memuat setidaknya: agen yang sedang berjalan (tiket, peran, ID) dan apa yang ditunggu dari masing-masing, antrean penggabungan, keputusan pemilik yang belum tercatat di tiket, pertanyaan yang menunggu pemilik, pengingat untuk pemilik, dan langkah berikutnya
- [ ] Bila handoff.md sudah ada dan konteks masih bertambah, sesi utama memperbaruinya, bukan membuat berkas kedua
- [ ] Setelah percakapan diringkas, sesi utama membaca handoff.md sebelum tindakan lain, melanjutkan dari isinya, lalu menghapusnya; berkas yang sudah dihapus tidak dibaca dua kali
- [ ] handoff.md tidak dianggap sebagai tiket, ringkasan status permanen, atau pengganti papan; pemeriksaan papan tidak menolaknya, dan pemeriksaan antrean mengabaikannya
- [ ] Panduan sesi utama dan penjelasan setelan menjelaskan kapan handoff ditulis, isinya, dan kapan dihapus
- [ ] Skenario "batas tercapai → handoff ditulis → percakapan diringkas → handoff dibaca dan dihapus" diuji atau punya skenario tangan yang bisa diikuti pemilik

## History
- 2026-10-26 15:22:13 55ce84d0-5e6a-481d-a7c3-df4acf92bf37 backlog
## Notes
- Permintaan mirza, 2026-10-26: "sepertinya mekanisme handoff juga perlu di buat untuk skill kerjaan … sebuah pesan khusus yang mungkin lokasinya setara dengan order.md dan settings.md yang menjelaskan hal-hal penting sebelum terjadi compacting … jika sudah mencapai n% yang didefinisikan dalam settings.md (defaultnya 80%) maka main agent harus membuat sebuah file bernama handoff.md. Seketika setelah terjadi compacting, main agent di sesi baru perlu membaca handoff.md … setelah itu dia harus menghapus file itu." Format berkas ditentukan saat pengerjaan.
- Catatan untuk pengerja (bukan keharusan): sesi utama tidak selalu tahu persentase konteksnya sendiri; periksa apa yang disediakan Claude Code (mis. hook sebelum ringkasan, hook saat sesi dimulai setelah ringkasan, atau info pemakaian konteks) untuk memicu penulisan dan pembacaan secara andal, bukan bergantung pada ingatan model.
- Aturan SKILL "jangan menulis ringkasan status ke .kerjaan/" perlu pengecualian yang jelas untuk handoff.md (berumur pendek, dihapus setelah dibaca).
- Contoh nyata isi yang dibutuhkan ada di video-system-design/_abaikan/serah-terima/SERAH-TERIMA.md bagian "Status 26-10 ±15:10".
