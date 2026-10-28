---
type: bug
priority: medium
review: normal
labels: [sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 19:58:49
updated: 2026-10-28 20:22:20
related: [261028172801, 261028185603]
blocked_by: []
---

## Background
Skrip papan memakai folder kunci supaya dua perubahan papan tidak saling
menimpa. Tiket 261028172801 membuat skrip menolak alamat folder kunci yang
tidak wajar, karena keluaran yang terpotong bisa masuk ke alamat itu dan
menjadi folder aneh di repo. Tiket 261028185603 lalu memindahkan pemeriksaan
itu ke satu pembuat folder bersama. Peninjaunya menemukan bahwa satu
penolakan ikut melemah: bila skrip gagal menemukan folder git proyek (yang
justru terjadi saat keluarannya terpotong), alamat folder kunci menjadi
`/kerjaan-locks` di akar sistem. Kode lama menolaknya, kode baru mencoba
membuatnya.

Di Mac pemilik akar sistem tidak bisa ditulisi, jadi akibatnya sama seperti
sebelumnya. Di Linux yang berjalan sebagai root, misalnya di dalam container,
folder itu benar-benar terbuat, dan semua repo di mesin itu akan berbagi
kunci yang sama, sehingga satu repo bisa menahan repo lain.

Selain itu, pengingat untuk peninjau masih membuat folder catatannya dengan
cara lama, yang membuat folder perantara apa saja tanpa memeriksa alamatnya.

## Request
Folder kunci papan tidak pernah dibuat di luar folder git proyek, dan
pengingat untuk peninjau membuat folder catatannya dengan pemeriksaan alamat
yang sama seperti bagian papan lainnya.

## Done when
- [x] Bila folder git proyek tidak bisa ditemukan, skrip papan menolak mengambil kunci dan berhenti dengan pesan, tanpa mencoba membuat folder di akar sistem
- [x] Ada uji yang membuktikan hal itu tanpa bergantung pada akar sistem yang tidak bisa ditulisi
- [x] Pengingat untuk peninjau menolak alamat folder catatan yang tidak wajar dan tetap mengingatkan seperti biasa dengan alamat yang wajar
- [x] Uji proyek ini lulus, termasuk uji baru untuk ketiga hal di atas

## History
- 2026-10-28 19:58:49 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 19:59:12 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 20:10:51 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 20:20:07 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 20:22:20 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43 ("Jadikan tiket, langsung kerjakan"), dari saran lanjutan peninjau 261028185603 dan temuan pengerjanya.
- Tempatnya: `kerjaan_locks_dir` di `skills/kerjaan/scripts/lib.sh` (bila `cd` ke git common dir gagal, `base` kosong lalu `kerjaan_locks` jadi `/kerjaan-locks`; kode sebelum 261028185603 menolaknya, `kerjaan_make_dir` meloloskannya karena induknya `/` ada) dan `mkdir -p "$state_dir"` di `skills/kerjaan/scripts/on-ticket-review.sh` (sekitar baris 388). Folder catatan itu dipakai bersama hook handoff, yang sejak 261028185603 menolak induk yang tidak ada.
- 2026-10-28 19:59:11: files estimated to change: `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/on-ticket-review.sh`, `tests/board-lock.test.mjs`, `tests/on-ticket-review.test.mjs`
- Pengerjaan: `kerjaan_locks_dir` kini hanya membuat alamat kunci dari folder git yang absolut dan bukan `/`; folder git yang kosong, tidak bisa dimasuki, atau `/` ditolak sebelum `mkdir` apa pun (termasuk `/` karena `//kerjaan-locks` sama dengan akar sistem). Pengingat peninjau membuat folder catatan dengan `kerjaan_make_dir` untuk folder induk lalu folder sesi, sama seperti handoff.sh; garis miring di ujung `$TMPDIR` dibuang dulu.
- Uji kunci memakai `git` palsu (menjawab `rev-parse --git-common-dir`) dan `mkdir` palsu yang mencatat setiap folder yang diminta, jadi tidak bergantung pada akar sistem yang tidak bisa ditulisi; satu uji pembanding dengan `.git` asli membuktikan palsunya sendiri tidak menyebabkan penolakan.
- Pemeriksaan `[ -n "$kerjaan_locks" ]` sebelum `kerjaan_make_dir` sempat ditambahkan lalu dibuang: dirusak, uji tetap hijau, karena `kerjaan_make_dir ""` sudah menolak alamat yang tidak absolut.
- Sabotase: `mkdir -p` dikembalikan di on-ticket-review.sh -> 3 uji alamat tidak wajar (relatif, berisi baris baru, induk tidak ada) merah; `case /?*` dibuang -> 3 uji folder git tidak wajar merah; cek nama kosong dibuang -> uji "is not named" merah (kunci terbuat di akar repo).
- 2026-10-28 20:19:47: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 5m5s, on content fingerprint 61469de187e94e8856ff8fcc5b59f723372d2c78 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28: Reviewed at level normal, round 1, at commit d117d50: passed.
  Level normal di sini: uji proyek dibawa dari jalannya pengerja (sama persis isinya), setiap kriteria dibuktikan dengan menjalankan sesuatu, dan uji baru dibaca untuk memastikan bisa merah. Tidak ada CLAUDE.md/AGENTS.md di akar repo.
  - Perintah: `test-run.sh --check 261028195801 d117d50` -> SAME: isi d117d50 sama dengan jalannya 2026-10-28 20:19:47 (sidik jari 61469de187e94e8856ff8fcc5b59f723372d2c78, 811/811, keluar 0); `test_command` tidak dijalankan ulang. Lalu `test-run.sh --review 261028195801 -- node --test --test-timeout=900000 tests/board-lock.test.mjs tests/on-ticket-review.test.mjs` -> 123/123 lulus, keluar 0, 48 detik.
  - Kriteria 1 (folder git tak ditemukan -> kunci ditolak, tanpa membuat folder di akar sistem): dibuktikan di repo buangan dengan `git` palsu yang menjawab `rev-parse --git-common-dir` dan `mkdir` palsu yang mencatat. Kode baru dengan folder git kosong, `/`, dan `gone`: status 1, pesan "Could not find the folder for kerjaan's locks", dan tidak ada `mkdir` sama sekali; dengan `.git` asli kunci dibuat di `.git/kerjaan-locks`. Kode sebelumnya (d117d50~1) pada kasus yang sama mencoba `mkdir /kerjaan-locks` dan `mkdir //kerjaan-locks`, dan dengan nama kosong membuat `kerjaan-locks` di akar repo. Terpenuhi.
  - Kriteria 2 (uji tanpa bergantung pada akar sistem yang tak bisa ditulisi): uji baru 18-21 di `tests/board-lock.test.mjs` memakai `git`/`mkdir` palsu dan menegaskan log `mkdir` tidak memuat `kerjaan-locks`; ini menjadi merah pada kode lama walau akar sistem tak bisa ditulisi (log mencatat percobaan `/kerjaan-locks`, seperti yang saya lihat di atas). Uji pembanding 21 membuktikan palsunya sendiri tidak menyebabkan penolakan. Terpenuhi.
  - Kriteria 3 (pengingat peninjau menolak alamat tak wajar, tetap mengingatkan dengan alamat wajar): `on-ticket-review.sh` kini memanggil `load_lib` lalu `kerjaan_make_dir` untuk folder induk dan folder sesi di dalam syarat `if`, jadi penolakan tidak menghentikan hook di bawah `set -e` dan pesan "Finish now with your report" tetap keluar. Uji 88-90 (relatif, berisi baris baru, induk tidak ada) lulus dan akan merah pada `mkdir -p` lama karena folder terbuat di tmp; uji 91 (TMPDIR bawaan berakhiran `/`) dan 92 lulus: catatan dibuat dan mandor mendapat "Dispatch one subagent right now". Terpenuhi.
  - Kriteria 4 (uji proyek lulus termasuk uji baru): SAME di atas, plus jalannya saya pada dua berkas uji terkait. Terpenuhi.
  - Catatan: perilaku kunci dengan alamat biasa tidak berubah: semua uji `board-lock.test.mjs` lain lulus.
  - Catatan kecil (tidak memblokir): `state_base="${state_base%/}"` membuang satu garis miring saja; `KERJAAN_HOOK_STATE=//` akan menjadi `/` dan folder sesi dibuat langsung di akar sistem. Itu setelan yang sengaja salah, bukan keluaran terpotong, jadi tidak perlu tiket.
