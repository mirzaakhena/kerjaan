---
type: bug
priority: high
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-28 17:28:43
updated: 2026-10-28 17:51:34
related: []
blocked_by: []
---

## Background
Agen yang membaca papan sering memotong keluaran skrip papan yang panjang supaya hanya beberapa baris pertama yang tampil. Di proyek video-system-design, setiap kali itu terjadi muncul folder kosong baru di akar repo. Nama folder itu adalah sepotong keluaran skrip, misalnya `Estimated and changed:` atau `261026004834 (backlog) and 261026004837 (backlog) share:`, diikuti baris baru. Di dalamnya ada tumpukan folder kosong yang meniru jalur lengkap repo sampai `.kerjaan/.locks`. Pemilik melihatnya di daftar berkas editornya dua kali dalam beberapa menit pada 2026-10-28, lalu harus menanyakannya. Folder itu tidak berisi apa-apa, tetapi mengotori repo dan bisa ikut ter-commit.

## Request
Memotong atau menghentikan keluaran skrip papan mana pun tidak boleh meninggalkan berkas atau folder apa pun di repo, dan skrip yang hanya membaca papan tidak membuat apa-apa sama sekali.

## Done when
- [ ] Langkah di "How to reproduce" tidak lagi memunculkan folder baru; isi akar repo sebelum dan sesudahnya sama
- [ ] Hal yang sama berlaku bila keluaran `queue.sh overlap`, `queue.sh check`, dan skrip papan lain yang hanya membaca dipotong dengan cara yang sama
- [ ] Skrip yang hanya membaca papan tidak membuat folder kunci, juga saat berjalan normal tanpa dipotong
- [ ] Uji proyek ini lulus, termasuk uji baru yang mengulang langkah reproduksi

## How to reproduce
1. Masuk ke repo git mana pun yang punya papan dengan satu tiket di `done/` yang commit-nya mengubah banyak berkas (di video-system-design: 261026004830)
2. Jalankan dari akar repo, dengan galat ikut ke pipa dan keluaran dipotong:
   `for i in 261026004830 261026004817; do <scripts>/queue.sh compare $i; done 2>&1 | head -3`
3. Lihat isi akar repo (`ls -A`)

Ada folder baru bernama `Estimated and changed:` diikuti baris baru, berisi folder kosong bertingkat `/Users/.../<repo>/.kerjaan/.locks`. Tanpa `2>&1` (`queue.sh compare <id> | head -1`) folder tidak muncul.

## History
- 2026-10-28 17:28:43 d771d2d5-e699-4565-8927-73760abccc14 backlog
- 2026-10-28 17:32:47 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 17:51:34 a185f853-6a65-4f44-919d-97ba97774e43 in_progress

## Notes
- Ditemukan 2026-10-28 di /Users/mirza/Workspace/video-system-design oleh planner (kerjaan 1.15.0). Langkah di atas dijalankan ulang oleh foreman di repo itu dan memunculkan folder yang sama; foldernya dihapus.
- Dugaan penyebab dari membaca kode, belum dibuktikan: saat pipa ditutup, `queue.sh` berhenti dan trap EXIT-nya (`rm -rf "$tmpdir"; kerjaan_lock_release board`) tetap melepas kunci, padahal `compare`, `overlap`, dan `check` tidak pernah mengambilnya. `kerjaan_lock_release` memanggil `kerjaan_locks_dir`, yang entah kenapa jatuh ke cabang "bukan repo git" (`common="$(pwd -P)/.kerjaan/.locks"; mkdir -p "$common"`), dan sisa keluaran yang tidak terkirim ikut masuk ke nama jalurnya. Kenapa `git rev-parse --git-common-dir` gagal di situ belum diketahui.
- Arah perbaikan yang terpikir (keputusan tetap di worker): lepas kunci hanya bila proses ini benar-benar memegangnya; tolak jalur kunci yang tidak absolut atau memuat baris baru sebelum `mkdir -p`.
- 2026-10-28 17:32:46: files estimated to change: `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/queue.sh`, `tests/board-lock.test.mjs`
