---
type: task
priority: medium
review: normal
labels: [sesi-a192c9e8, queue, parallel]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 03:20:45
related: [261016122402]
blocked_by: []
---

## Background

Saat dua tiket dalam satu grup antrean menyentuh berkas yang sama, pengantar
grup harus menyebut tiket mana yang digabung ke main lebih dulu. Pemeriksaan
antrean mengenalinya dengan mencocokkan kalimat bebas dalam bahasa Inggris dan
Indonesia ("lands first", "digabung lebih dulu", "mendarat dahulu", dan
belasan variasi lainnya).

Cara ini rapuh. Kalimat yang sedikit berbeda tidak dikenali, dan daftar
variasinya akan terus bertambah untuk setiap bahasa papan.

## Request

Urutan penggabungan ditulis dengan satu penanda tetap yang selalu dikenali,
apa pun bahasa papannya.

## Done when
- [x] Ada satu penanda tetap untuk menyatakan tiket mana yang digabung lebih dulu, dijelaskan di panduan urutan antrean
- [x] Grup yang memakai penanda itu dinyatakan siap, dan grup yang tidak memakainya dinyatakan belum siap beserta alasannya
- [x] Pencocokan kalimat bebas sudah dihapus
- [x] Uji yang ada untuk pemeriksaan urutan diperbarui dan lulus
- [x] Pengantar grup yang masih tersisa di order.md papan ini memakai penanda baru, dan pemeriksaan antrean menyatakannya siap

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:21 todo
- 2026-10-17 02:57:25 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-17 03:19:25 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review
- 2026-10-17 03:20:45 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec done

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: `queue.sh:299-323`, `:444-472`. Contoh bentuk penanda:
  `<!-- first: 261016141901 -->` per grup, atau urutan butir di dalam grup.
- 2026-10-16 14:36:46: files estimated to change: `agents/kerjaan-planner.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/queue.sh`, `uji/queue.test.mjs`
- 2026-10-16 14:38:11: answered question: Bentuk penanda: (a) baris tetap per grup, misalnya <!-- lands-first: ID -->, sama di semua bahasa; atau (b) tanpa penanda, butir pertama dalam grup selalu digabung lebih dulu? Saran: (a), karena butir 2 menuntut grup tanpa penanda ditolak, dan (b) tidak bisa membedakan urutan yang disengaja dari kebetulan. Tambahan: setelah tiket ini masuk main, pengantar grup yang tersisa di order.md batch ini memakai kalimat lama; boleh pengerja tiket ini mengubahnya ke penanda baru? Saran: boleh.
  answer, 2026-10-16 14:45:50: (a) Satu baris tetap per grup, misalnya <!-- lands-first: ID -->; dan ya, pengerja tiket ini mengubah pengantar grup yang tersisa di order.md ke penanda baru.
- 2026-10-17 Keputusan teknis (tidak menahan): penanda berbentuk `<!-- lands-first: <id>, <id> -->`, satu baris per grup, berisi ID dalam urutan digabung, dipisah koma. Dengan satu ID ia persis contoh jawaban pemilik; daftar diperlukan karena grup bertiga (1907/1908/1913, 1910/1914/1909) tidak bisa diurutkan dengan satu ID. Dari dua tiket yang berbagi berkas, yang lebih awal di daftar digabung lebih dulu, dan tiket yang tercantum mendahului tiket yang tidak tercantum; dua tiket yang sama-sama tidak tercantum dinyatakan belum siap. Kata `lands-first` huruf kecil, titik dua, ID 12 digit dengan koma; spasi bebas. Baris boleh di mana saja di antara pembuka tebal grup dan pembuka berikutnya. Prosa pengantar tidak dibaca lagi untuk urutan, dan `check` tidak lagi menuntut pengantar menyebut kedua ID.
- 2026-10-17 Keputusan teknis (tidak menahan): tiket yang keluar dari todo. `update-ticket.sh` mencabut ID-nya dari baris lands-first grupnya (urutan sisanya tetap), membuang baris yang tak lagi menyebut siapa pun, dan baris ikut hilang bila grupnya kosong. Baris yang bentuknya tidak terbaca dibiarkan apa adanya agar `check` melaporkannya. Karena itu `check` melaporkan ID di baris lands-first yang bukan tiket grupnya (hasil suntingan tangan), juga baris yang mirip penanda tetapi tak terbaca (`<!-- lands first: ... -->`, huruf besar, tanpa koma, ID dalam backtick), baris kedua dalam satu grup, dan ID yang disebut dua kali — masing-masing dengan nomor barisnya.
- 2026-10-17 Ide lanjutan (tidak menahan): penampil (`viewer/web/markdown.js`) meng-escape HTML, jadi baris `<!-- lands-first: ... -->` tampil sebagai teks di laci order.md, tidak tersembunyi seperti di pratinjau markdown biasa. Bisa dibiarkan (urutannya justru terlihat) atau disembunyikan/dirender khusus di tiket lain.
- 2026-10-17 order.md papan ini: tiga grup yang berbagi berkas kini punya baris penanda (`261016141905, 261016141906`; `261016141907, 261016141908, 261016141913`; `261016141910, 261016141914, 261016141909`), urutannya sama dengan kalimat lama; prosanya dibiarkan. `queue.sh check` atas papan ini: `READY`. Order.md lama (tanpa penanda) dengan skrip baru: `NOT READY: 6 problem(s)`, satu per pasangan yang berbagi berkas.
- 2026-10-17 Uji mutasi (berkas disalin dulu, dipulihkan dari salinan; `uji/queue.test.mjs` dan `uji/update-ticket.test.mjs`):
  - `queue.sh`, pasangan yang diurutkan baris penanda tidak di-`continue` → merah: 6 uji check (siap dengan penanda, posisi baris, baris kedua, grup bertiga, tiket keluar todo, contoh panduan).
  - baris tak terbaca tidak dilaporkan → merah: "a lands-first line that cannot be read…".
  - deteksi baris kedua dimatikan → merah: "a second lands-first line … named twice".
  - laporan ID dua kali dimatikan → merah: uji yang sama.
  - laporan ID bukan tiket grupnya dimatikan → merah: "counts anywhere inside its group, and only there".
  - cabang pesan "names neither" dimatikan → merah: "group of three…".
  - koma dibuat opsional dalam bentuk baris → merah: "cannot be read".
  - deteksi mirip-penanda dipersempit ke `lands-first` saja → merah: "cannot be read" (kasus `lands first`, `landsfirst`, `Lands_First`).
  - `update-ticket.sh`, ID tidak dicabut dari baris → merah: 5 uji update-ticket lands-first dan uji integrasi di queue.test.
  - baris kosong tidak dibuang (`if (0) next`) → merah: "a lands-first line left naming nobody goes".
- 2026-10-17 03:19:22: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m22s, on content fingerprint ef0b39a47fbb92527d17b55fc88f070f81a584de (the same before and after the run; .kerjaan/ left out).

### Review 2026-10-17

Reviewed at level normal, round 1, at commit 5856617 (pekerjaan di a784b9a, langsung di main, tanpa worktree): seluruh uji proyek tidak dijalankan ulang karena hasil pengerja sudah mencakup isi yang sama persis, lalu setiap kriteria diperiksa dengan membaca perubahan, membaca ujinya, dan menjalankan pemeriksaan antrean di papan ini.

- `test-run.sh --check 261016141912 HEAD` → SAME: run 2026-10-17 03:19:22, `node --test --test-timeout=900000 --test-force-exit`, exit 0, fingerprint ef0b39a47fbb92527d17b55fc88f070f81a584de. Uji penuh dibawa dari run pengerja itu.
- `queue.sh check` di papan ini → `READY` (exit 0), `order.md in step with todo`.
- Tidak ada `CLAUDE.md`/`AGENTS.md` di repo ini; tidak ada aturan proyek tertulis yang diterapkan. `owner_explanation` tidak diatur, tidak ada `## Explanation`.

Per kriteria:
1. Terpenuhi. `references/ordering-the-queue.md`, "Saying which lands first", menjelaskan baris `<!-- lands-first: <id>, <id> -->`, arti urutannya, dan apa yang ditolak. Uji "the marker ordering-the-queue.md documents is the one check reads" menjalankan contoh di bagian itu terhadap `check`.
2. Terpenuhi. Grup berbagi berkas tanpa baris → `the group has no line saying which lands first (write <!-- lands-first: <id> --> under its lead-in)`; baris yang tidak menyebut keduanya → `names neither ... (add one of them to it)`; baris tak terbaca, baris kedua, ID ganda, ID di luar grup masing-masing dilaporkan dengan nomor barisnya. Uji-ujinya memeriksa kode keluar dan pesan persisnya, bukan sekadar tidak gagal.
3. Terpenuhi. `first_re`, `before_re`, `squeeze`, `lands_first`, `lands_before` dan pembacaan prosa pengantar dihapus dari `queue.sh`; `grep` di `skills/`, `agents/`, `hooks/`, `viewer/` tidak menemukan pencocok kalimat lain. Uji "the free wording ... is no longer read" memastikan kalimat lama (Inggris dan Indonesia) kini dinyatakan belum siap.
4. Terpenuhi. Uji urutan di `uji/queue.test.mjs` ditulis ulang untuk penanda, ditambah uji pencabutan ID di `uji/update-ticket.test.mjs`; seluruh suite lulus (dibawa dari run pengerja, lihat di atas). Uji yang dibaca punya asersi yang bisa merah (kode keluar, pesan, isi order.md byte demi byte).
5. Terpenuhi. Tiga grup berbagi berkas di `.kerjaan/order.md` kini punya baris penanda dengan urutan yang sama dengan kalimat lama; `queue.sh check` → `READY`.

Bentuk daftar berkoma tetap dalam keputusan pemilik: pemilik memilih "satu baris tetap per grup, misalnya `<!-- lands-first: ID -->`", dan bentuk ini tetap satu baris tetap per grup, sama di semua bahasa; satu ID adalah persis contoh pemilik, dan daftar dibutuhkan untuk grup bertiga di papan ini.

Catatan (tidak menahan):
- Penanda hanya dikenali bila baris dimulai dengan `<!--`. Penanda yang ditulis di ujung kalimat pengantar (satu baris dengan prosa) tidak dibaca dan tidak dilaporkan sebagai tak terbaca; grupnya tetap dinyatakan belum siap dengan alasan "no line", jadi tidak ada yang lolos diam-diam, hanya pesannya kurang tepat.
- Prosa pengantar grup pertama di order.md masih menyebut 261016141912 digabung lebih dulu; itu benar dan tidak dibaca lagi oleh `check`.
- Klaim di Notes bahwa order.md lama dengan skrip baru memberi `NOT READY: 6 problem(s)` tidak diulang; uji "free wording is no longer read" mencakup perilaku yang sama.

### Suggested follow-up

- **Baris `<!-- lands-first: ... -->` tampil sebagai teks mentah di penampil papan.** `viewer/web/markdown.js` meng-escape HTML, jadi komentar yang tersembunyi di pratinjau markdown biasa terlihat di laci order.md. Layak jadi tiket: putuskan apakah baris itu disembunyikan atau ditampilkan khusus (misalnya sebagai "urutan gabung: A, B").
