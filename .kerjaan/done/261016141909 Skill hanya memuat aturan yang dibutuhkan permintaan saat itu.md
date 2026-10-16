---
type: task
priority: high
review: normal
labels: [sesi-a192c9e8, skill, token]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 06:35:26
related: [261011073101, 261016141911]
blocked_by: [261016141904, 261016141905, 261016141907, 261016141908]
---

## Background

Setiap kali skill dipanggil, seluruh berkas utamanya dimuat: sekitar 740
baris, kira-kira 8 sampai 9 ribu token. Permintaan sesederhana "catat ini ke
backlog" ikut membawa aturan tentang mandor, kerja berdampingan,
penggabungan, review dan commit, yang tidak dibutuhkannya.

Banyak aturan juga ditulis berulang: batas ukuran tiket di enam tempat, peran
penyusun antrean di empat tempat, dan larangan meninjau pekerjaan sendiri di
tiga tempat. Sebagian prosa menjelaskan cara kerja dalam skrip yang tidak
perlu diketahui model, atau menyuruh model melakukan dengan tangan hal yang
sudah dilakukan skrip.

## Request

Berkas utama skill hanya memuat yang dibutuhkan hampir setiap permintaan.
Sisanya dibaca dari panduan terpisah saat memang diperlukan, dan setiap aturan
punya satu tempat.

## Done when
- [x] Berkas utama skill paling banyak sekitar 350 baris, dengan jumlah kata sebelum dan sesudah tercatat di Notes
- [x] Ringkasan perintah di awal skill hanya memuat perintah yang dipakai hampir setiap sesi
- [x] Setiap aturan tertulis lengkap di satu tempat, dan tempat lain hanya merujuk dalam satu baris
- [x] Panduan tidak lagi menyuruh menjalankan dengan tangan hal yang sudah dikerjakan skrip
- [x] Sesi baru yang diminta "catat ini ke backlog" membuat tiket yang benar tanpa membuka panduan mana pun
- [x] Sesi baru yang diminta mengerjakan todo tetap menemukan dan mengikuti panduan mandor
- [x] Total kata berkas utama, panduan dan definisi agen turun, bukan hanya berpindah tempat, dengan angka sebelum dan sesudah tercatat di Notes (keputusan pemilik di 261016141911)

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:25 todo
- 2026-10-17 06:10:01 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 06:32:43 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review
- 2026-10-17 06:35:26 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 done

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Kandidat pindah ke panduan: SKILL.md:418-741 (dari "Into `todo`" sampai
  akhir). Penjelasan yang bisa dipangkas: algoritme ID (129-132), mekanika
  sidik jari uji (594-604), daftar pengecualian cabang (513-521), sejarah
  History (213-222).
- Ringkasan gerbang di SKILL.md:77-83 adalah contoh gaya rujukan yang tepat.
- `K="${CLAUDE_PLUGIN_ROOT}/..."` di baris 21 tidak punya cadangan bila
  variabelnya kosong, padahal ketiga agen punya.
- Prosa yang mengerjakan tugas skrip: `ordering-the-queue.md:136-138` (diff
  manual) dan `parallel-work.md:60-64` (perintah git worktree mentah).
- 2026-10-16 14:36:47: files estimated to change: `agents/kerjaan-planner.md`, `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/`
- 2026-10-16 14:38:09: answered question: Butir 5 dan 6 (perilaku sesi baru) hanya teruji dengan plugin dari repo, bukan plugin terpasang. Boleh pengerja mengujinya sendiri lewat claude -p --plugin-dir (memakai kuota), dengan cadangan skenario tangan yang ditunda bila tidak bisa; atau langsung ditunda; atau menahan rantai? Saran: pengerja menguji lewat --plugin-dir, cadangannya ditunda.
  answer, 2026-10-16 14:45:48: Pengerja menguji lewat claude -p --plugin-dir; skenario tangan yang ditunda menjadi cadangannya.
- 2026-10-17 (pengerja): angka sebelum dan sesudah, dihitung dengan `wc -l`/`wc -w`.
  - Berkas utama `skills/kerjaan/SKILL.md`: 846 baris / 7.418 kata sebelum, 351 baris / 2.855 kata sesudah.
  - Total berkas utama + `references/*.md` + `agents/*.md`: 25.617 kata sebelum, 19.535 kata sesudah (turun 6.082 kata, sekitar 24%). Per berkas sesudah (sebelum): foreman.md 3.681 (3.828), ordering-the-queue.md 1.415 (1.876), parallel-work.md 2.984 (3.418), review.md 1.259 (1.536), repairs.md 403 (403), kerjaan-planner.md 1.650 (1.850), kerjaan-reviewer.md 2.989 (2.989), kerjaan-worker.md 2.299 (2.299).
- 2026-10-17 (pengerja): yang dipindah dan yang dihapus.
  - Ringkasan perintah di SKILL.md kini hanya `new-ticket.sh`, `update-ticket.sh` (pindah, ganti judul, segarkan) dan `ls` cari ID, ditambah tabel "kapan membaca panduan mana" — termasuk `repair.sh` di baris repairs.md (titipan dari 261016141914). `K=` kini punya cadangan `find` bila `CLAUDE_PLUGIN_ROOT` kosong, seperti ketiga agen; jalur SETTINGS.md dan viewer diturunkan dari `$K`.
  - Pindah ke `references/foreman.md`: tiket yang kerjanya keputusan, "tandai selesai", saat papan sepi, urutan mengambil tiket, jawaban untuk gerbang cabang belum digabung (langkah 1), dan pembagian tiga commit (bagian baru "Commits"). SKILL.md "Committing" tetap memuat bentuk perintah commit dan aturan perpindahan tanpa kode.
  - Salinan yang dihapus dan diganti rujukan satu baris: pengecualian ubahan teks kecil dan kerja tanpa tiket di SKILL.md, aturan pengelompokan di parallel-work.md dan planner, aturan lands-first di planner, cara memperbaiki tiket yang dikembalikan dan "tiket tersangkut di review" di review.md (sudah ada di definisi pengerja dan SKILL.md "Starting a session"), paragraf commit dan cabang yang belum digabung di parallel-work.md, uraian algoritme ID, sidik jari uji, daftar pengecualian cabang dan sejarah History di SKILL.md.
  - Langkah tangan yang sudah dikerjakan skrip: perintah mentah `git worktree add`/`git sparse-checkout` di parallel-work.md diganti penjelasan apa yang dikerjakan `worktree.sh add`; `diff` manual todo-vs-order.md di ordering-the-queue.md diganti `queue.sh check` yang sudah melaporkannya; blok `git worktree list` di "Nothing is remembered" dihapus.
- 2026-10-17 (pengerja): berkas di luar estimasi: `uji/commit-papan.test.mjs` (daftar tiga commit kini dibaca dari foreman.md "Commits", ditambah syarat SKILL.md tidak mengulangnya dan menunjuk ke sana) dan uji baru `uji/skill-ringkas.test.mjs`.
- 2026-10-17 (pengerja): uji baru `uji/skill-ringkas.test.mjs` — batas ~350 baris, plafon 21.000 kata total, ringkasan perintah hanya skrip harian, tiap skrip disebut di SKILL.md atau panduan (per skrip), tiap panduan punya baris di tabel SKILL.md (per panduan), cadangan `K` saat `CLAUDE_PLUGIN_ROOT` kosong/tak diset/diset (dijalankan), tak ada langkah tangan di blok kode (per dokumen), dua belas aturan masing-masing di tepat satu dokumen, dan setiap rujukan `<berkas>, "<bagian>"` menunjuk bagian yang ada (per rujukan, 23 rujukan).
- 2026-10-17 (pengerja): bukti uji bisa merah — tiap penjaga dirusak pada salinan lalu dipulihkan dari salinan itu: SKILL.md +25 baris → merah "at most about 350 lines"; +1.500 kata di repairs.md → merah plafon kata; `worktree.sh` ditambah ke ringkasan → merah; `release.sh` dihapus dari foreman.md → merah hanya untuk release.sh; baris repairs.md / foreman.md dihapus dari tabel → merah (foreman: 2 uji); baris cadangan `K` dihapus → merah; blok `git worktree add` di parallel-work.md, `diff <(` di ordering-the-queue.md, `git sparse-checkout set` di kerjaan-worker.md → masing-masing merah untuk berkas itu (pemisah blok kode awalnya salah memasangkan pagar dan uji diff tetap hijau; diperbaiki dengan pembaca per pagar dan ujinya sendiri); "Nothing moves before the owner approves" disalin ke ordering-the-queue.md, daftar tiga commit disalin balik ke SKILL.md atau dihapus dari foreman.md, batas ukuran disalin ke planner, "Fix the kind of mistake" disalin ke review.md → merah; judul "Commits" diganti → 3 merah (uji commit dan dua uji rujukan).
- 2026-10-17 (pengerja): butir 5 dan 6 diuji dengan `claude -p --plugin-dir /Users/mirza/Workspace/kerjaan --settings '{"enabledPlugins":{"kerjaan@kerjaan":false}}'` (plugin terpasang dimatikan; init sesi menunjukkan kerjaan dimuat dari repo ini) di repo coba di scratchpad.
  - Butir 5: repo dengan papan kosong, diminta "catat ini ke backlog: di halaman laporan perlu tombol untuk mengunduh penjualan harian sebagai berkas CSV ...". Panggilan alat: Skill kerjaan, `ls`/`cat settings.md`, `new-ticket.sh backlog`, Read tiket, dua Edit, `update-ticket.sh <id>` — tak satu pun membuka `references/`. Hasil: tiket `feature`/`medium` di backlog dengan Background, Request dan lima Done when yang bisa diperiksa orang awam, History terisi.
  - Butir 6: repo dengan satu tiket siap di todo, diminta "kerjakan todo". Sesi membaca `references/foreman.md` sebagai langkah pertama setelah skill, menjalankan `queue.sh check`, memindah tiket ke in_progress dan meng-commit awal, mengutus `kerjaan:kerjaan-worker` lalu `kerjaan:kerjaan-reviewer`, dan saat papan sepi menjalankan `release.sh unreleased` dan `queue.sh compare`. Riwayat: tiga commit (mulai, kerja, putusan), tiket di done.
- 2026-10-17 06:32:37: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m35s, on content fingerprint bede20cb0d15f38f811a99b516b344e42c6e3860 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: Reviewed at level normal, round 1, at commit 1751f5f: passed.
  Level normal di sini berarti: uji proyek dihitung sekali (dibawa dari jalannya pengerja), lalu tiap butir Done when dibuktikan sendiri dengan menghitung, membandingkan isi lama dan baru, dan membaca uji barunya apakah benar bisa gagal.
  - Uji proyek: `test-run.sh --check 261016141909 1751f5f` menjawab SAME — jalannya pengerja 2026-10-17 06:32:37 (`node --test ...`, exit 0, sidik jari bede20cb0d15f38f811a99b516b344e42c6e3860) mencakup isi yang persis sama, jadi tidak dijalankan ulang.
  - Butir 1: `wc -l -w` sendiri — SKILL.md 351 baris / 2.855 kata sekarang, 846 / 7.418 di 1751f5f^. Cocok dengan Notes.
  - Butir 2: ringkasan perintah kini hanya `new-ticket.sh`, `update-ticket.sh` (pindah, ganti judul, segarkan) dan `ls` cari ID, plus cadangan `K=` yang mencari folder skrip bila `CLAUDE_PLUGIN_ROOT` kosong. Perintah lain disebut di panduan; uji per skrip menjaganya.
  - Butir 3: isi SKILL.md lama dibandingkan bagian demi bagian dengan tempat barunya. Yang dipindah ada utuh di `references/foreman.md` (Commits, tandai selesai, tiket keputusan, saat papan sepi, gerbang cabang belum digabung di langkah 1, urutan mengambil tiket di "Starting the chain"); centang Done when (tak terpenuhi, batal, menunggu orang) ada di definisi pengerja; pemicu uang/otentikasi untuk tingkat review ada di review.md dan planner; perawatan order.md oleh update-ticket.sh ada di ordering-the-queue.md. Batas ukuran tiket kini hanya di SKILL.md; "Never review your own work" hanya di SKILL.md (definisi pengerja hanya melarangnya dalam daftar). Tidak ditemukan aturan yang hilang; yang dihapus adalah alasan panjang, contoh berulang, dan uraian cara kerja skrip (algoritme ID, sidik jari, daftar pengecualian cabang, riwayat History).
  - Butir 4: diff memastikan blok `git worktree add`/`git sparse-checkout set` di parallel-work.md, `diff <(` di ordering-the-queue.md dan blok `git worktree list` sudah diganti penjelasan apa yang dikerjakan skrip. Uji per dokumen membaca blok kode pagar demi pagar.
  - Butir 5 dan 6: `claude -p` bersarang ditolak lingkungan peninjau, jadi dinilai dari jejak yang disimpan pengerja di scratchpad sesi. `coba5.jsonl`: init memuat kerjaan dari repo ini (`kerjaan@inline`), panggilan alatnya Skill, `ls`/`cat settings.md`, `new-ticket.sh`, Read, dua Edit, `update-ticket.sh` — tidak ada yang membuka `references/`; tiket yang dihasilkan (`coba5/.kerjaan/backlog/261017062301 …`) lengkap dan benar formatnya, dengan Done when yang bisa diperiksa orang awam. `coba6.jsonl`: langkah pertama setelah Skill adalah membaca `references/foreman.md`, lalu `queue.sh check`, pindah ke in_progress, utus `kerjaan:kerjaan-worker`, lalu `kerjaan:kerjaan-reviewer`. Teks skill yang dimuat kedua sesi itu sama bagian akhirnya dengan SKILL.md yang di-commit, dan cadangan dokumen terakhir pengerja (`bak_*`) identik dengan isi commit.
  - Butir 7: total SKILL.md + references + agents dihitung sendiri: 25.617 kata di 1751f5f^, 19.535 sekarang. Turun 6.082 kata, bukan hanya pindah.
  - Uji baru `uji/skill-ringkas.test.mjs` dibaca: penjaganya bisa gagal (dijalankan, bukan cuma mencocokkan teks literal — misalnya cadangan `K` benar dijalankan di bash dengan HOME palsu), dan perubahan `uji/commit-papan.test.mjs` mengikuti pemindahan bagian Commits.
  - Catatan, tidak menghalangi: (1) Pengecualian "ubahan teks kecil yang diminta pemilik" kini hanya ada di foreman.md, dan aturan 2 di SKILL.md berbunyi mutlak ("every ticket goes to a `kerjaan-worker`") tanpa menyebut ada pengecualian. Sesi yang diminta membetulkan salah ketik baru akan menemukannya setelah membuka foreman.md, dan bisa lebih dulu membuat tiket. Arahnya aman (lebih banyak kerja, bukan aturan dilanggar), tapi ini jalan pintas yang justru dipakai di permintaan kecil. (2) "Tick `Done when` line by line" keluar dari daftar aturan yang sering dilanggar; kini dibawa definisi pengerja dan SKILL.md menunjuk ke sana. (3) Uji baru memasang plafon 21.000 kata, lebih longgar dari anggaran 18.000 milik 261016141911, jadi tidak bertabrakan; total sekarang 19.535 masih di atas 18.000. 261016141911 sebaiknya mengganti angka di uji yang sama, bukan menambah uji kedua dengan batas lain.

### Suggested follow-up

- **Aturan 2 di berkas utama skill tidak menyebut pengecualian ubahan teks kecil.** Bila pemilik meminta membetulkan satu salah ketik di README, sesi baru membaca "setiap tiket ke pengerja" dan bisa membuat tiket serta mengutus pengerja dan peninjau untuk satu kata. Yang diinginkan: satu baris di aturan 2 yang menyebut adanya pengecualian itu dan merujuk ke panduan mandor, tanpa menyalin isinya.
