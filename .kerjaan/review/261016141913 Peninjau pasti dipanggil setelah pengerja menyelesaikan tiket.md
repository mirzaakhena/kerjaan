---
type: bug
priority: medium
review: normal
labels: [sesi-a192c9e8, hooks, review]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 05:17:33
related: [261016141906]
blocked_by: []
---

## Background

Hook kerjaan dibuat supaya peninjau pasti dipanggil saat sebuah tiket masuk
review. Tetapi pada jalur yang paling sering dipakai, yaitu pengerja yang
memindahkan tiketnya sendiri ke review, hook hanya menyuruh pengerja
berhenti. Pemanggilan peninjau kembali bergantung pada mandor yang membaca
laporan pengerja, padahal komentar di hook itu sendiri menyebut cara ini tidak
bisa diandalkan.

Hook juga tidak mengenali beberapa cara menulis perintah pindah ke review,
misalnya bila nama status diberi tanda kutip atau digabung dengan tanda sama
dengan.

## How to reproduce

1. Mandor mengutus pengerja untuk sebuah tiket
2. Pengerja menyelesaikan pekerjaan dan memindahkan tiketnya ke review
3. Mandor lupa membaca laporan pengerja atau melanjutkan ke hal lain

Tiket diam di review, dan tidak ada pengingat yang sampai ke mandor.

## Request

Setiap tiket yang masuk review karena pekerjaan pengerja diikuti pengingat
kepada mandor untuk memanggil peninjau, tanpa bergantung pada mandor yang
ingat sendiri.

## Done when
- [ ] Saat pengerja selesai dan tiketnya ada di review, mandor menerima pengingat untuk memanggil peninjau — menunggu mirza: skenario tangan di Notes
- [x] Pengerja yang selesai tanpa memindahkan tiket ke review tidak memicu pengingat itu
- [x] Perintah pindah ke review dengan nama status yang diberi tanda kutip atau ditulis dengan tanda sama dengan tetap dikenali
- [x] Ada uji otomatis untuk ketiga hal di atas

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:23 todo
- 2026-10-17 04:55:21 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 05:17:33 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Saran teknis: hook `SubagentStop` yang memeriksa apakah tiket pengerja kini
  berada di `review/`. Lokasi: `on-ticket-review.sh:9-10`, `:44`, `:101-115`;
  `foreman.md:177`, `:203`.
- 2026-10-16 14:36:47: files estimated to change: `README.md`, `hooks/hooks.json`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/scripts/on-ticket-review.sh`, `uji/on-ticket-review.test.mjs`
- 2026-10-16 14:38:10: answered question: Butir 1 (mandor menerima pengingat) di sesi sungguhan baru aktif setelah plugin diperbarui. Cukup uji otomatis atas skrip hook, dengan cek di sesi sungguhan ditunda sebagai skenario tangan; atau menahan rantai? Saran: ditunda.
  answer, 2026-10-16 14:45:50: Uji otomatis atas skrip hook diterima; cek di sesi sungguhan ditunda sebagai skenario tangan.
- 2026-10-17: catatan pengerja.
  - Saran teknis `SubagentStop` tidak dipakai. Dokumentasi Claude Code dan
    percobaan di Claude Code 2.1.302 (`claude -p` dengan hook pencatat)
    menunjukkan keluaran `SubagentStop` -- sinkron, `async`, maupun
    `asyncRewake` -- kembali ke subagen dan membuatnya terus berjalan, tidak
    pernah ke mandor. Yang sampai ke sesi utama saat subagen selesai: `PostToolUse`
    pada alat `Agent` (pengerja di latar depan; `tool_response.status`
    `completed`, `agentId`) dan `UserPromptSubmit` berisi `<task-notification>`
    dengan `<task-id>` = ID agen (pengerja di latar belakang, juga setelah
    dilanjutkan dengan SendMessage). Kedua bentuk masukan itu ditangkap dari
    sesi sungguhan dan dipakai apa adanya di uji.
  - Cara kerja: `on-ticket-review.sh` kini melayani tiga peristiwa. Saat
    pengerja (ada `agent_id`) memindahkan tiket ke review, hook mencatat jalur
    tiket di `$KERJAAN_HOOK_STATE` (bawaan `$TMPDIR/kerjaan-review-hook`)
    `/<session_id>/<agent_id>`. Saat agen itu selesai, hook di sesi utama
    membaca catatan itu, menghapusnya, dan -- bila tiket masih di `review/` --
    memberi mandor instruksi yang sama dengan pemindahan oleh mandor sendiri
    (putaran 1: utus peninjau; putaran berikut: lanjutkan peninjau; setelah
    merge postponed: tinjauan setelah merge postponed), diawali "Your worker
    subagent <id> has finished". `hooks/hooks.json` menambah `PostToolUse`
    matcher `Agent|Task` dan `UserPromptSubmit`.
  - Pengenalan perintah: regex atas `--status review`, `"review"`, `'review'`,
    `--status=review`, `--status="review"`, `--status='review'`, spasi ganda
    atau tab, dengan batas kata sesudahnya (`--status reviewed` tidak cocok).
    `update-ticket.sh` sebelumnya menolak `--status=review` ("Unknown
    option"), sehingga butir 3 tak berarti tanpa itu: kini menerima
    `--status=<status>` dan `--title=<judul>`, dan menolak `--status=` kosong.
  - Dokumen: `foreman.md` (baris `REVIEW` dan langkah 5) tidak lagi menyebut
    "no hook message reaches you"; README dan SKILL.md menjelaskan pengingat
    yang menyertai laporan pengerja. Uji dokumen lama diganti mengikuti itu.
  - Diukur di sesi sungguhan tanpa plugin terpasang (`claude -p --model haiku
    --settings` yang menunjuk skrip di repo ini, papan contoh dan
    `update-ticket.sh` tiruan): pengerja di latar belakang dengan
    `--status=review` -> mandor menerima "UserPromptSubmit hook additional
    context: Your worker subagent ... Dispatch one subagent right now ...";
    pengerja di latar depan dengan `--status "review"` -> pengingat ikut hasil
    Agent; agen kedua yang tidak memindahkan tiket -> tidak ada pengingat.
  - Uji dibuat merah dengan sengaja (salin berkas, rusak, jalankan
    `uji/on-ticket-review.test.mjs`, pulihkan dari salinan, `cmp` sama):
    regex hanya bentuk polos (16 gagal); tanpa `=` (8); tanpa kutip (10);
    tanpa batas kata (2); catatan pengerja tidak ditulis (25); pengingat dari
    notifikasi dimatikan (23); pengingat dari hasil Agent dimatikan (2); cek
    `async_launched` dibuang (1); cek `isAsync` dibuang (1); catatan tidak
    dihapus setelah dipakai (1); cek tiket masih di review dibuang (1); lewati
    `agent_id` pada prompt dibuang (1) dan pada Agent dibuang (1); folder
    catatan tanpa sesi (1); syarat `<task-notification>` dibuang (1, setelah
    uji prompt pemilik yang mengutip tag ditambahkan; sebelumnya tetap hijau);
    nama lama `Task` dibuang (1); `--status=*` di update-ticket.sh dibuang
    (5); cek `--status=` kosong dibuang (1); matcher `Agent|Task` di
    hooks.json dirusak (1); `UserPromptSubmit` di hooks.json dirusak (1).
  - Skenario tangan butir 1 (setelah plugin dengan perubahan ini terpasang):
    1. Perbarui plugin kerjaan ke rilis yang memuat tiket ini, lalu buka sesi
       Claude Code baru di repo yang punya papan `.kerjaan/`.
    2. Buat satu tiket kecil di `todo` (misalnya mengubah satu kalimat
       README) dan minta "kerjakan antrean".
    3. Biarkan mandor mengutus pengerja seperti biasa (di latar belakang) dan
       jangan mengetik apa pun sampai pengerja selesai.
    4. Saat notifikasi pengerja datang, terminal menampilkan pesan singkat
       "Worker finished: Ticket <id> entered review — dispatching a
       reviewer.", dan mandor langsung mengutus `kerjaan-reviewer` untuk
       tiket itu tanpa diminta.
    5. Ulangi dengan tiket yang pengerjanya berhenti dengan `STOPPED —
       decision` (tiket tetap di `in_progress`): tidak ada pesan "Worker
       finished" dan tidak ada peninjau yang diutus.
- 2026-10-17 05:17:29: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m17s, on content fingerprint 1788158536774f3959adf7e1ff24818bca23b8b8 (the same before and after the run; .kerjaan/ left out).
