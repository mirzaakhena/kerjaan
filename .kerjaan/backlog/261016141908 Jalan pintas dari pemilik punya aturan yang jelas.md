---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, skill, foreman]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 14:21:57
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
- [ ] Untuk "langsung saja", skill menyebut siapa yang menulis kodenya
- [ ] "Tandai selesai" pada tiket di todo atau in_progress punya jalur yang tidak ditolak skrip dan tetap melewati rekaman uji
- [ ] Tiket kerja berdampingan yang diterima pemilik ikut digabung ke main seperti tiket yang lolos
- [ ] Ada langkah tertulis untuk melanjutkan pengerja setelah pemilik menjawab keputusan yang ditunggu
- [ ] Skill menyatakan dengan tegas apakah perubahan sangat kecil boleh dikerjakan mandor sendiri, dan alasannya

## History
- 2026-10-16 14:19:06 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: SKILL.md:46-48, :312, :650-658; `review.md:56-57`, `:100-102`;
  `foreman.md:192-194`.
