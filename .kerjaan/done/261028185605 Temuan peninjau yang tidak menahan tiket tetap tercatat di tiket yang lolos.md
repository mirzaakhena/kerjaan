---
type: bug
priority: medium
review: quick
labels: [agen, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:45
updated: 2026-10-28 19:09:06
related: [261028171401]
blocked_by: []
---

## Background
Tiket 261028171401 meringkas catatan tinjauan: tinjauan yang lolos kini
ditulis satu baris per butir. Peninjaunya menemukan efek samping. Panduan
peninjau tidak lagi meminta temuan yang tidak menahan tiket (misalnya uji
yang lemah, atau aturan proyek yang dilanggar tanpa menggagalkan butir)
ditulis ke tiket yang lolos. Temuan itu kini mungkin hanya sampai di laporan
peninjau ke mandor, lalu hilang, dan tidak terbaca siapa pun yang membuka
tiketnya nanti.

## Request
Peninjau yang meloloskan tiket tetap menulis setiap temuan yang tidak
menahan tiket ke tiket itu, masing-masing satu baris, tanpa membuat tinjauan
yang lolos kembali panjang.

## Done when
- [x] Panduan peninjau meminta temuan yang tidak menahan tiket ditulis ke tiket yang lolos, satu baris per temuan
- [x] Batas kata panduan peninjau dan skill tidak dinaikkan
- [x] Uji otomatis gagal bila permintaan itu hilang dari panduan peninjau

## History
- 2026-10-28 18:56:45 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 18:59:29 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 19:03:04 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 19:08:26 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 19:09:06 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Saran lanjutan peninjau 261028171401; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Tempatnya paragraf "Every criterion met" di `agents/kerjaan-reviewer.md`. Panduan peninjau 2.992 dari 3.000 kata per 2026-10-28, jadi frasa baru harus menggantikan kata lain.
- 2026-10-28 18:59:15: files estimated to change: `agents/kerjaan-reviewer.md`, `tests/reviewer-rules.test.mjs`
- Frasa "one line per finding that did not block" ditambahkan ke paragraf "Every criterion met"; panduan peninjau kini tepat 3.000 dari 3.000 kata (batas tidak dinaikkan, tapi tidak ada sisa untuk perubahan berikutnya).
- Sabotase: frasa diganti "one line per finding" di `agents/kerjaan-reviewer.md` → `tests/reviewer-rules.test.mjs` uji "a passing review is one line per criterion…" merah; dipulihkan dari salinan.
- 2026-10-28 19:08:18: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 4m33s, on content fingerprint 1053c3fc0ad3dcc1f86c105bee600f3159f0308d (the same before and after the run; .kerjaan/ left out).
- 2026-10-28: Reviewed at level quick, round 1, at commit 3a1650d: passed.
- Butir 1: paragraf "Every criterion met" di `agents/kerjaan-reviewer.md` kini meminta "one line per finding that did not block" di `## Notes` tiket yang lolos, di samping satu baris per butir; tinjauan tetap pendek.
- Butir 2: diff tidak menyentuh angka batas (`tests/reviewer-rules.test.mjs` tetap `n <= 3000`, `BUDGET` di `tests/skill-size.test.mjs` tidak berubah); panduan peninjau naik dari 2.992 ke 3.000 kata (`wc -w`), masih dalam batas.
- Butir 3: `tests/reviewer-rules.test.mjs` menambah `assert.match(passed, /one line per finding that did not block/)` pada potongan paragraf "Every criterion met"; uji itu merah bila frasanya hilang. Uji penuh: `test-run.sh --check 261028185605 3a1650d` → SAME (jalan 2026-10-28 19:08:18, sidik 1053c3fc0ad3dcc1f86c105bee600f3159f0308d, exit 0), tidak dijalankan ulang.
- Catatan: panduan peninjau kini tepat 3.000 dari 3.000 kata; aturan berikutnya harus mengganti kata lain lebih dulu.
- Catatan: penyuntingan menyisakan baris pendek "you went past the level. A passing review is" di tengah paragraf; kosmetik saja.
- Dinilai dengan membaca saja: butir 1 dan 3 (sabotase pekerja tidak diulang; level quick).
