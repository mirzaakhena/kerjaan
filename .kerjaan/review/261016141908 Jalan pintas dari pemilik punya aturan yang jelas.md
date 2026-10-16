---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, skill, foreman]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-17 04:41:52
related: [261016141909]
blocked_by: []
---

## Background

Beberapa jalan pintas yang diminta pemilik tidak dijelaskan sampai tuntas:

- **"Langsung saja, tanpa tiket"**: aturan bahwa sesi utama tidak pernah
  menulis kode berlaku per tiket. Tanpa tiket, tidak jelas apakah mandor
  menulis kodenya sendiri atau tetap mengutus pengerja.
- **"Tandai selesai"**: mandor disuruh mencentang daftar selesai dan
  memindahkan tiket ke review. Itu tugas pengerja, dan langkah ini melewati
  rekaman uji. Dari todo, perpindahan ini juga ditolak skrip.
- **Tiket yang diterima pemilik setelah dua penolakan**: dipindah ke done,
  tetapi tidak ada yang menggabungkan cabangnya ke main bila tiket itu
  dikerjakan berdampingan.
- **Tiket yang dihentikan karena menunggu keputusan pemilik**: tidak ada
  langkah untuk melanjutkannya setelah pemilik menjawab.
- **Perbaikan satu kata**: tetap melewati pengerja dan peninjau, tanpa
  pengakuan atas biayanya.

## Request

Setiap jalan pintas di atas punya satu jalur yang jelas, dan pengecualian
untuk pekerjaan yang sangat kecil dinyatakan terang, beserta alasannya.

## Done when
- [x] Untuk "langsung saja", skill menyebut bahwa kodenya tetap ditulis pengerja yang diutus, walau tanpa tiket
- [x] "Tandai selesai" pada tiket di todo atau in_progress punya jalur yang tidak ditolak skrip dan tetap melewati rekaman uji
- [x] Tiket kerja berdampingan yang diterima pemilik ikut digabung ke main seperti tiket yang lolos
- [x] Ada langkah tertulis untuk melanjutkan pengerja setelah pemilik menjawab keputusan yang ditunggu
- [x] Skill menyatakan dengan tegas bahwa mandor boleh mengerjakan sendiri perubahan sangat kecil bila pemilik memintanya langsung, terbatas pada teks atau dokumen tanpa logika (yang menyentuh skrip tetap ke pengerja), beserta alasannya

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:23 todo
- 2026-10-17 04:30:52 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-17 04:41:52 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: SKILL.md:46-48, :312, :650-658; `review.md:56-57`, `:100-102`;
  `foreman.md:192-194`.
- 2026-10-16 14:36:47: files estimated to change: `agents/kerjaan-worker.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/review.md`, `skills/kerjaan/scripts/merge.sh`, `uji/merge.test.mjs`
- 2026-10-16 14:38:09: answered question: Untuk "langsung saja, tanpa tiket": siapa yang menulis kodenya, (a) tetap pengerja yang diutus tanpa tiket, atau (b) mandor sendiri? Saran: (a), karena alasan konteks bersih mandor tetap berlaku walau tanpa tiket.
  answer, 2026-10-16 14:45:47: (a) Pengerja, tetap diutus walau tanpa tiket.
- 2026-10-16 14:38:09: answered question: Perubahan sangat kecil (salah ketik, satu kata): (a) tidak pernah dikerjakan mandor sendiri, atau (b) boleh dikerjakan mandor bila pemilik memintanya langsung, terbatas pada teks/dokumen tanpa logika, sedangkan apa pun yang menyentuh skrip tetap ke pengerja? Saran: (b), karena biaya pengerja dan peninjau jauh melebihi perubahannya.
  answer, 2026-10-16 14:45:47: (b) Mandor boleh mengerjakannya sendiri bila pemilik memintanya langsung, terbatas pada teks atau dokumen tanpa logika; apa pun yang menyentuh skrip tetap ke pengerja.
- 2026-10-17 04:39:01: laporan pengerja (klaim, bukan bukti). Yang diubah: SKILL.md (aturan 2, "Who does the work", "Work starts from a ticket", "When the user says 'mark it done'"), foreman.md (pengecualian teks kecil, bagian baru "Work without a ticket", butir "Accepted by the owner" di langkah 5, "When the owner answers"), review.md (tiket yang diterima pemilik di-land), kerjaan-worker.md (prompt "The owner says this work is done", "When you are resumed with the owner's answer", "When there is no ticket"), merge.sh (hanya pesan REFUSED dan komentar kepala; tidak ada logika baru — land sudah menerima tiket done yang datang dari in_progress). Uji baru: uji/merge.test.mjs (tiket diterima pemilik setelah dua penolakan di-land; varian saat main bergerak: ditunda, sync, review, land; jalur "tandai selesai" dari todo: todo->review ditolak, todo->in_progress->test-run->review->done diterima) dan uji/jalan-pintas.test.mjs (lima uji dokumen, satu per butir Done when). Dibuktikan bisa merah: (1) land dibuat menolak tiket yang History-nya punya lebih dari satu in_progress -> kedua uji 'diterima pemilik' merah; (2) penolakan todo->review di update-ticket.sh dimatikan -> uji 'tandai selesai' merah; (3) 18 kalimat aturan di SKILL.md, foreman.md, review.md, kerjaan-worker.md dan pesan merge.sh diubah satu per satu -> uji dokumen yang sesuai merah tiap kali. Semua dipulihkan dari salinan. Uji dokumen 261016141905/261016141907 tidak perlu diubah: kalimat yang dipatok (`queue.sh answer ... then resume that worker`, blok commit) tetap ada.
- 2026-10-17 04:39:11: open question: Tidak menahan pekerjaan. Untuk kerja tanpa tiket ("langsung saja") saya menulis: tidak ada peninjau kecuali pemilik memintanya, dan pengerja hanya meng-commit bila prompt bilang pemilik mau di-commit (foreman.md "Work without a ticket"). Pilihan: (a) seperti itu; (b) selalu ada peninjau ringan (quick) walau tanpa tiket; (c) selalu commit. Saran: (a), karena peninjau menilai terhadap Done when sebuah tiket dan tanpa tiket tidak ada yang bisa dinilai, dan izin commit dalam skill hanya diberikan lewat tiket di rantai.
- 2026-10-17 04:41:46: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m31s, on content fingerprint 3ee7c8cac9247fc79e1a11575bc89b823829b874 (the same before and after the run; .kerjaan/ left out).
