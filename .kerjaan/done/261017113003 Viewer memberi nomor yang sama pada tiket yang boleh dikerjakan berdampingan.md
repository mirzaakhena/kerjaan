---
type: feature
priority: medium
review: quick
labels: [sesi-8e6130e0, order-md, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 11:30:54
updated: 2026-10-17 20:05:48
related: [261017113001, 261017113002, 261017113004]
blocked_by: [261017113001, 261017113002]
---

## Background
Kartu tiket di kolom todo viewer diberi nomor #1, #2, #3, ... menurut posisinya di order.md, satu nomor per tiket. Dari nomor itu tidak terlihat tiket mana yang boleh dikerjakan bersamaan, dan tiket yang sedang dikerjakan tidak lagi menunjukkan tempatnya dalam urutan.

## Request
Nomor di kartu menunjukkan urutan kelompok di order.md: tiket dalam satu kelompok mendapat nomor yang sama, dan tiket yang sedang dikerjakan atau di review tetap memegang nomor kelompoknya sampai selesai. Kelompok yang menunggu izin pemilik mendapat tanda yang terlihat.

## Done when
- [x] Dua tiket dalam satu kelompok order.md tampil dengan nomor yang sama, dan kelompok berikutnya mendapat nomor sesudahnya
- [x] Tiket di in_progress dan review yang masih tercantum di order.md tetap menampilkan nomor kelompoknya
- [x] Setelah semua tiket kelompok pertama selesai, kelompok berikutnya menjadi #1
- [x] Kartu dalam kelompok bertanda "menunggu pemilik" menampilkan tanda yang bisa dibaca orang awam
- [x] Viewer dan pemeriksaan antrean membaca kelompok dengan aturan yang sama, dan uji yang ada membuktikan keduanya sepakat

## History
- 2026-10-17 11:30:54 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 11:41:31 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 19:49:19 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 20:04:37 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review
- 2026-10-17 20:05:29 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 done

## Notes
- 2026-10-17: lahir dari pembahasan pemilik dengan Claude tentang aturan dan format order.md, sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`). Empat tiket dari sesi ini: 261017113001, 261017113002, 261017113003, 261017113004.
- 2026-10-17: nomor yang sama berarti boleh berdampingan, belum tentu sedang berjalan bersamaan (batas jumlah berdampingan dari 261017113002 bisa membuat satu tiket menunggu). Nomornya tetap sama karena tempatnya di antrean memang sama.
- 2026-10-17 11:36:22: files estimated to change: `README.md`, `skills/kerjaan/scripts/board.mjs`, `viewer/app.mjs`, `viewer/uji/urutan.test.mjs`, `viewer/web/gaya.css`, `viewer/web/proyek.js`
- 2026-10-17: dikerjakan. Nomor dihitung di `orderPlaces` (board.mjs) di atas `readOrderGroups`, tanpa pembaca order.md ketiga: nomor = tempat kelompok di antara kelompok yang masih memegang tiket di todo/in_progress/review. Tiket done, cancel, backlog, atau yang tidak ada di papan tidak bernomor dan tidak membuat kelompoknya terhitung. ID yang tercantum dua kali ikut kelompok pertamanya, seperti `readOrder`. `readBoard` mengirim `places`, dan kartu di semua kolom memakainya.
- 2026-10-17: keputusan: tanda "waits for the owner's go-ahead" muncul di setiap kartu kelompok ber-`<!-- wait-for-owner -->` selama belum ada tiketnya di in_progress/review. Ini aturan yang sama dengan `queue.sh check`, yang menganggap kelompok seperti itu sudah dimulai dan tidak menanyakannya lagi. Kalau tanda tetap ada di tiket yang sedang berjalan, tanda itu menyesatkan. Label dan tooltip berbahasa Inggris, sesuai keputusan pemilik.
- 2026-10-17: uji dibuat gagal dengan sengaja (viewer/uji/urutan.test.mjs, semuanya merah lalu dipulihkan dari salinan): nomor per tiket alih-alih per kelompok, sehingga uji orderPlaces 11–14 dan peramban 16–19 merah; LIVE hanya todo, sehingga 12, 13, 14, 15, 18, 19 merah; kelompok kosong ikut terhitung, sehingga 13, 14, 19 merah; aturan "sudah dimulai" dibuang, sehingga 14, 15, 19 merah; waitsForOwner selalu false, sehingga 14, 15, 19 merah; dedup lintas kelompok dibuang, sehingga 13 merah; proyek.js hanya memberi nomor di todo, sehingga 18 merah; proyek.js tanpa tanda, sehingga 19 merah.
- 2026-10-17: kesepakatan dengan pemeriksaan antrean: uji baru membandingkan kelompok bertanda viewer dengan baris "waits for the owner … it starts only" dan "… has started" dari `queue.sh check` pada empat keadaan papan. Uji lama tetap membandingkan keanggotaan kelompok `readOrderGroups` dengan check.
- 2026-10-17: skenario tangan: (1) buat papan dengan order.md berisi dua kelompok; kelompok kedua diberi `<!-- wait-for-owner -->` dan dua tiket todo; satu tiket kelompok pertama ada di in_progress dan satu di review. (2) Jalankan `node viewer/server.mjs` lalu buka proyeknya. (3) Hasilnya: kartu in_progress, review, dan todo dari kelompok pertama sama-sama menampilkan #1; kedua kartu kelompok kedua menampilkan #2 dan tanda kuning "waits for the owner's go-ahead". (4) Pindahkan semua tiket kelompok pertama ke done; kelompok kedua sekarang #1. (5) Pindahkan satu tiket kelompok kedua ke in_progress; tandanya hilang dari kedua kartu.
- 2026-10-17: 261017193401 mendarat lebih dulu; main digabung lewat merge.sh sync tanpa konflik (README.md: paragraf --lan dan paragraf nomor kelompok berdampingan), lalu diuji ulang.
- 2026-10-17 20:00:41: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m53s, on content fingerprint fcc4cd66a9395ec47ff1f69461e737fe1b25c12b (the same before and after the run; .kerjaan/ left out). Waited 0m44s for the test lock first, held by another run (ticket 261017193401, slot 2, /Users/mirza/Workspace/kerjaan-lan).
- 2026-10-17 20:04:29: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 3m30s, on content fingerprint a1f56506af588b0e59c2108047dd76f64f1f2fa2 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 20:04:37: review covers branch tiket-261017113003 at 2c5988940656f809f16b5fc5423f79e27ff82a2e, which holds main at b337ace399fcb0cf278f8b1923cb7df067a66782 (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-17: Reviewed at level quick, round 1, at commit 2c5988940656f809f16b5fc5423f79e27ff82a2e: passed.
  Level quick: uji dijalankan sekali (dibawa dari putaran pekerja), dan perubahan dibaca baris demi baris terhadap Done when. Tidak ada server yang dijalankan.
  - Uji: `test-run.sh --check 261017113003 2c59889` menjawab SAME — `node --test --test-timeout=900000 --test-force-exit` keluar 0 pada 2026-10-17 20:04:29, sidik isi a1f56506af588b0e59c2108047dd76f64f1f2fa2. Tidak dijalankan ulang.
  - Kriteria 1 (satu kelompok, satu nomor): `orderPlaces` di board.mjs menaikkan `n` sekali per kelompok dan memberi semua tiketnya nomor itu; uji "the tickets of one group share a number" dan uji peramban yang diubah (`#2, #2, #3`) memeriksanya.
  - Kriteria 2 (in_progress/review tetap bernomor): `LIVE` = todo, in_progress, review; proyek.js kini memberi lencana di semua kolom dari `board.places`. Uji "keep their group number" dan uji peramban kolom in progress/review (`#1`).
  - Kriteria 3 (kelompok berikutnya jadi #1): kelompok tanpa tiket hidup dilewati (`if (!held.length) continue`); uji untuk done, cancel, backlog dan tiket tak ada, serta uji peramban "a group finished moves the next group up to #1".
  - Kriteria 4 (tanda menunggu pemilik): label kuning "waits for the owner's go-ahead" dengan tooltip, bahasa Inggris sesuai keputusan pemilik; uji peramban memeriksa teks, tooltip, dan hilangnya tanda saat satu tiket kelompok pindah ke in_progress.
  - Kriteria 5 (aturan sama dengan pemeriksaan antrean): kelompok dibaca oleh `readOrderGroups` yang sudah diuji setara dengan check; aturan "sudah dimulai" sama dengan queue.sh baris 615–625 (ada tiket di in_progress/review). Uji baru menjalankan `queue.sh check` pada empat keadaan papan dan membandingkan kelompok bertanda/tidak dengan barisnya.
  - Catatan: tidak ada. Teks Indonesia lama di proyek.js ("belum digabung", "rusak") bukan bagian tiket ini.
  - Tidak diverifikasi dengan menjalankan sesuatu oleh peninjau: kelima kriteria dinilai dari membaca diff dan uji, dengan satu-satunya bukti jalan berupa run uji pekerja yang dibawa lewat SAME. Sabotase yang dilaporkan pekerja tidak diulang.
- 2026-10-17 20:05:48: landed on main as 581e004faf4a337c1fbc9e1999c56e6de87f3d38, merging tiket-261017113003 at 2c5988940656f809f16b5fc5423f79e27ff82a2e; tests carried from the run on this exact content, not run again.
