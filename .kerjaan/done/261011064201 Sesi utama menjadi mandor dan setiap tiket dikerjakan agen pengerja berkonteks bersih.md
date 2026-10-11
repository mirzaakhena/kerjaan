---
type: feature
priority: high
review: normal
labels: [skill, agen]
reporter: mirza
assign_to: claude
created: 2026-10-11 06:42:23
updated: 2026-10-11 07:32:42
related: []
blocked_by: []
---

## Background

Skill kerjaan sekarang mengandaikan sesi yang membuka papan juga mengerjakan
tiketnya sendiri. Sesudah memindah tiket ke `review`, hook
`on-ticket-review.sh` menyuruh sesi itu memanggil `kerjaan-reviewer`, lalu
mengambil tiket berikutnya di konteks yang sama. Akibatnya, setiap tiket
menambah isi konteks sesi. Pada tiket kedua atau ketiga konteksnya penuh,
sesi kena compacting, dan pengguna harus membuka sesi baru per tiket supaya
tiap tiket mulai bersih.

Pada 10–11 Oktober 2026, di papan nukitu-mockup, Mirza mencoba cara lain.
Sesi utama menjadi mandor yang tidak mengerjakan kode. Setiap tiket
dikerjakan satu subagent baru yang konteksnya kosong. Mandor memanggil
peninjau sesudah pengerja melapor, lalu mengutus pengerja berikutnya. Hasil
yang tercatat di papan itu (`.kerjaan/done/261009225701` sampai `…708`,
commit `a06f745` sampai `52b205e`):
- Delapan tiket Flutter selesai berurutan dalam satu sesi, sementara Mirza
  tidur.
- Dua tiket ditolak satu kali (704, 703). Keduanya dikembalikan ke pengerja
  yang sama dan lolos di putaran kedua.
- Satu tiket butuh 37–80 menit kerja pengerja, menurut durasi yang
  dilaporkan alat Agent.
- Yang masuk ke konteks mandor hanya laporan ringkas pengerja dan peninjau.
  Isi berkas dan keluaran uji tetap di konteks subagent.

Pengerja malam itu memakai agen `general-purpose`, dengan prompt panjang
yang ditulis ulang mandor setiap tiket. Hook juga menyuruh pengerja memanggil
peninjau, sehingga setiap prompt harus melarangnya secara eksplisit.

Keputusan Mirza, 11 Oktober 2026:
- Cara ini menjadi standar skill kerjaan.
- Pengerjanya dibuat sebagai agen khusus, seperti `kerjaan-reviewer`.
- Berlaku selalu, juga untuk satu tiket: sesi utama tidak pernah mengerjakan
  kode tiket sendiri.
- Penundaan pemeriksaan yang hanya bisa dilakukan manusia menjadi pilihan
  yang ditanyakan mandor di awal rantai.

## Request

Pengguna menyerahkan satu atau banyak tiket kepada satu sesi, dan setiap
tiket dikerjakan sampai lolos review oleh pengerja yang mulai dari konteks
bersih. Pengguna tidak perlu membuka sesi baru per tiket, dan sesi utama
tetap ringan sampai rantai selesai.

## Done when
- [x] Ada agen pengerja khusus di `agents/`, berdampingan dengan
      `kerjaan-reviewer`. Mandor cukup mengirim jalur tiket dan bekal dari
      tiket-tiket sebelumnya. Langkah tetapnya (baca aturan proyek dan tiket,
      kerjakan, ukur, buktikan uji bisa merah, commit, pindah ke `review`,
      lapor ringkas) ada di definisi agennya, tidak ditulis ulang per tiket.
- [x] SKILL.md menjelaskan sesi utama sebagai mandor dalam setiap kasus,
      juga untuk satu tiket: sesi utama tidak menyunting kode tiket sendiri.
- [x] Hanya mandor yang memanggil peninjau. Pengerja yang memindah tiket ke
      `review` tidak disuruh hook memanggil peninjau. Bisa diuji dengan
      menjalankan hook dari konteks pengerja dan dari konteks mandor.
- [x] Tiket yang ditolak peninjau dikembalikan ke pengerja yang sama dengan
      melanjutkannya dari transkripnya (mis. `SendMessage` ke agen itu),
      bukan dengan mengutus pengerja baru dan bukan dengan pengerja yang
      menunggu. Pengerja langsung memperbaiki tanpa membaca ulang tiket atau
      kode dari awal. Putaran ulangnya ditinjau oleh peninjau yang sama,
      yang juga dilanjutkan dari transkripnya. Kalau sesi mandor sudah
      berganti dan pengerja lama tidak bisa dilanjutkan, pengerja baru
      bekerja dari Notes tiket, dan ringkasan rantai menyebut bahwa itu
      terjadi.
- [x] Rantai berhenti sendiri dan melapor kepada pengguna dalam tiga keadaan:
      ada keputusan milik pengguna (pengerja menulis pertanyaan, pilihan,
      dan rekomendasinya di tiket, tanpa menebak), peninjau menolak tiket
      yang sama dua kali, atau tiket yang menjadi landasan tiket lain tidak
      lolos. Pertanyaan yang tidak menahan pekerjaan tidak menghentikan
      rantai, tetapi tetap tercatat di tiket.
- [x] Di awal rantai, mandor menanyakan butir yang hanya bisa diperiksa
      manusia: ditunda atau menahan rantai. Kalau ditunda, butir itu ditulis
      sebagai skenario tangan, ditandai "menunggu <pengguna>" di tiket, dan
      peninjau tidak menolak tiket karenanya. Jawaban pengguna dicatat di
      tiket-tiket yang terkena.
- [x] Mandor meneruskan bekal dari tiket ke tiket: komponen yang sudah
      dibangun, jebakan yang ditemukan, dan pola penolakan sebelumnya. Bekal
      itu sampai ke pengerja berikutnya tanpa pengerja harus membaca riwayat
      sesi mandor.
- [x] Di akhir rantai, atau saat rantai berhenti, pengguna mendapat satu
      ringkasan: tiket mana yang lolos dan di putaran keberapa, mana yang
      berhenti dan kenapa, serta semua pertanyaan yang terkumpul.
- [x] `references/parallel-work.md` dan bagian lain yang mengandaikan sesi
      mengerjakan tiketnya sendiri diselaraskan, tanpa saling bertentangan
      dengan SKILL.md.
- [x] README menjelaskan cara kerja ini kepada pengguna baru.

## History
- 2026-10-11 06:42:23 backlog
- 2026-10-11 07:20:34 in_progress
- 2026-10-11 07:27:35 review
- 2026-10-11 07:28:57 done

## Notes
- Sumber: sesi nukitu-mockup 10–11 Okt 2026. Prompt pengerja dan peninjau
  yang dipakai malam itu bisa dijadikan bahan awal definisi agen. Bagian yang
  terbukti perlu:
  - Setiap jalan pulang dari layar diuji sampai back sungguhan.
  - Aturan yang berlaku untuk banyak contoh diuji per contoh.
  - Penjaga disabotase di setiap tempat ia dipasang, dipulihkan dari salinan
    (bukan `git checkout --`).
  - Commit memakai pathspec per berkas, dan papan di-commit sendiri.
  - Run suite dicatat supaya `test-run.sh --check` peninjau menemukan bukti.
- Dua penolakan malam itu punya satu pola: kodenya benar, ujinya hanya
  menjangkau satu contoh atau satu jalan. Sesudah pelajaran itu ditambahkan
  ke bekal, lima tiket berikutnya lolos di putaran pertama. Ini dugaan
  hubungan sebab-akibat dari lima kejadian, belum diukur.
- Pengerja yang menunggu run latarnya sendiri membuat alat Agent mengirim
  notifikasi "completed" berulang sebelum laporannya datang. Mandor perlu
  tahu bahwa notifikasi itu belum berarti selesai.
- Mandor malam itu memakai catatan kemajuan di scratchpad (satu baris per
  tiket: hash commit, putusan, pertanyaan untuk pengguna). Dari catatan itu
  ringkasan pagi disusun.
- Perlu diputuskan saat dikerjakan: apakah agen pengerja boleh memakai
  `SendMessage` untuk bertanya ke mandor di tengah kerja, atau hanya lewat
  laporan akhir dan Notes tiket. Malam itu hanya lewat laporan akhir.
- Keputusan Mirza 11 Okt 2026: pengerja tidak menunggu peninjau. Konteks
  pengerja dipertahankan dengan melanjutkannya dari transkrip saat tiket
  ditolak. Alasannya: mandor tetap melihat setiap putusan sebelum pengerja
  bertindak (untuk menghitung "ditolak dua kali" dan meneruskan bekal), dan
  tidak ada pengerja yang menganggur untuk tiket yang lolos.
- Bukti dari nukitu-mockup, durasi menurut alat Agent: pengerja 703 yang
  dilanjutkan menutup penolakan dalam ~2,5 menit, dan pengerja 704 dalam
  ~11 menit (termasuk `npm run uji` penuh ~6,5 menit). Keduanya tanpa
  membaca ulang tiket atau kode.
- Batasan: pengerja hanya bisa dilanjutkan selama sesi mandor masih hidup.
- Keputusan saat dikerjakan, 11 Okt 2026:
  - Agen pengerja bernama `kerjaan-worker` (`agents/kerjaan-worker.md`), sejajar
    dengan `kerjaan-reviewer`. Panduan mandor ada di
    `skills/kerjaan/references/foreman.md`.
  - Pengerja **tidak** memakai `SendMessage` untuk bertanya ke mandor di
    tengah kerja. Pertanyaan lewat laporan akhir dan Notes tiket, seperti
    malam itu. Alasannya: pengerja yang menunggu jawaban menahan tiketnya,
    padahal pemilik mungkin sedang tidak ada. Keputusan yang tidak bisa
    menunggu adalah alasan untuk berhenti, bukan untuk bertanya.
  - Pengerja tidak diberi alat `Agent`. Menurut dokumentasi Claude Code,
    subagent kini bisa mengutus subagent lain, jadi larangan memanggil
    peninjau tidak cukup ditulis sebagai aturan.
  - Hook membedakan pengerja dari mandor lewat `agent_id` di masukan hook,
    yang hanya ada kalau langkah itu dijalankan di dalam subagent. Subagent
    jenis apa pun dianggap pengerja.
  - Mandor menunggu putusan peninjau sebelum mengutus pengerja berikutnya,
    supaya pohon kerja diam saat ditinjau dan pelajaran dari penolakan
    sempat masuk ke bekal.
  - Commit: pengerja meng-commit kode bersama berkas tiketnya sendiri, dengan
    pathspec per berkas. Ini menyelaraskan catatan "papan di-commit sendiri"
    dengan aturan Committing di SKILL.md, yang meminta berkas tiket ikut di
    commit kodenya.
  - Yang tidak bisa diuji di sesi ini: plugin yang terpasang masih 1.8.1,
    jadi `kerjaan:kerjaan-worker` belum terdaftar dan rantai mandor belum
    dijalankan sungguhan. Yang diuji hanya hook: skripnya dijalankan dengan
    masukan seperti dari pengerja dan dari mandor
    (`uji/on-ticket-review.test.mjs`).
  - Uji hook dibuktikan bisa merah: cabang `agent_id` sengaja dimatikan, dan
    dua uji pengerja menjadi merah. Sesudah itu skrip dipulihkan dari salinan.
- 2026-10-11 07:27:12: test run — `node --test` exited 0 after 0m4s, on content fingerprint 24ea4e27766924603e132af9cab7ae1b57a59a8f (the same before and after the run; .kerjaan/ left out).
- 2026-10-11, review oleh kerjaan-reviewer. Ditinjau di level normal, putaran 1, pada commit 45363b3: uji proyek tidak dijalankan ulang karena hasil run pengerja dibawa (lihat di bawah). Hook dijalankan sendiri oleh peninjau dari dua sisi, dan setiap butir `Done when` dibaca terhadap diff. **Lolos.**
  - Uji (`node --test`): dibawa dari run pengerja 2026-10-11 07:27:12, fingerprint 24ea4e27766924603e132af9cab7ae1b57a59a8f. `test-run.sh --check 261011064201` pada pohon kerja menjawab SAME. Terhadap commit 45363b3 jawabannya DIFFERENT, dan satu-satunya bedanya adalah `CATATAN-BERIKUTNYA.md`: berkas catatan yang belum dilacak git, ada di pohon kerja tetapi tidak di commit. Berkas itu tidak memengaruhi `node --test`.
  - `explain.sh check`: penjelasan tidak dipakai (`owner_explanation: off`), jadi tidak ada yang diperiksa.
  - Butir 3, yang diuji dengan menjalankan hook: peninjau menjalankan `on-ticket-review.sh` dengan masukan hook buatan sendiri. Tanpa `agent_id` (sisi mandor), keluarannya "Dispatch one subagent right now with subagent_type \"kerjaan-reviewer\"…" dan menunjuk `foreman.md`. Dengan `agent_id` dan `agent_type: kerjaan:kerjaan-worker` (sisi pengerja), keluarannya "…Do not dispatch a reviewer… Finish now with your report." tanpa systemMessage. Keduanya keluar dengan kode 0. Dokumentasi hook Claude Code (code.claude.com/docs/en/hooks) membenarkan bahwa `agent_id` hanya ada kalau hook berjalan di dalam subagent atau in-process teammate. Uji di `uji/on-ticket-review.test.mjs` tidak kosong: setiap uji memeriksa isi teks untuk sisi yang diuji, dan uji pengerja juga memastikan perintah "Dispatch one subagent" tidak muncul.
  - Butir 1: `agents/kerjaan-worker.md` ada di samping `kerjaan-reviewer.md` dan tidak diberi alat `Agent`. Langkah 1–10 di dalamnya memuat semua langkah tetap yang diminta. Prompt di `foreman.md` hanya berisi jalur tiket, skrip, worktree, jawaban pemilik, dan bekal.
  - Butir 2: SKILL.md aturan 2 dan bagian "Who does the work" berlaku juga untuk satu tiket.
  - Butir 4: `foreman.md` ("Act on the verdict", "When a worker or reviewer cannot be resumed"), `review.md`, dan bagian resume di `kerjaan-reviewer.md` memuat langkah `SendMessage` ke pengerja yang sama dan peninjau yang sama, cara kembali ke Notes kalau mereka tidak bisa dilanjutkan, dan kewajiban menyebutnya di ringkasan.
  - Butir 5: `foreman.md` "When the chain stops" memuat tiga keadaan berhenti. Langkah 2 di definisi pengerja melarang menebak, dan pertanyaan yang tidak menahan kerja tetap dicatat.
  - Butir 6: `foreman.md` "Starting the chain" langkah 2. Pengerja menangani butir yang ditunda lewat langkah 6. Peninjau mendapat aturan bahwa butir "awaiting" yang ditunda tidak menjadi alasan menolak.
  - Butir 7: `foreman.md` bagian "Carry-forward", ditambah baris `Carry-forward:` di laporan pengerja.
  - Butir 8: `foreman.md` bagian "The summary".
  - Butir 9: `parallel-work.md`, `review.md`, `explanation.md`, `ordering-the-queue.md`, `docs/cara-kerja-reviewer.md`, dan SKILL.md sudah diselaraskan. Pencarian frasa lama ("do not wait", "pick up the next", "session that did the work") tidak menemukan sisa yang bertentangan.
  - Butir 10: README punya bagian baru "One session, many tickets", dan bagian "Review happens by itself" sudah diperbarui.
  - Catatan yang tidak menahan tiket:
    - `foreman.md` menulis "When it reports `REVIEW`, the hook asks for a reviewer again". Itu kurang tepat. Saat pengerja memindah tiket, hook berjalan di dalam pengerja dan menyuruhnya melapor. Mandor bertindak atas laporan itu, bukan atas hook.
    - Pesan hook untuk mandor selalu berbunyi "Dispatch one subagent right now", juga di putaran kedua, padahal di putaran itu `foreman.md` meminta peninjau lama dilanjutkan. Mandor hanya menerima pesan ini kalau ia sendiri yang memindah tiket (jalur penjelasan pemilik), jadi dampaknya kecil.
    - In-process teammate juga membawa `agent_id`, jadi oleh hook ia dianggap pengerja. Ini sesuai dengan keputusan "subagent jenis apa pun dianggap pengerja".
    - Perpindahan tiket ke `review` belum di-commit. Ini sesuai aturan Committing: putusan masuk di commit berikutnya.
  - Dinilai dengan membaca saja: butir 1, 2, dan 4–10 berupa dokumentasi dan definisi agen. Rantai mandor sungguhan belum pernah dijalankan karena plugin yang terpasang masih 1.8.1, seperti yang sudah dicatat pengerja.

### Suggested follow-up

- **Rantai mandor belum pernah dijalankan dari plugin yang memuat perubahan ini.** Yang sudah diuji baru hook-nya. Pemanggilan `kerjaan:kerjaan-worker`, kelanjutan lewat `SendMessage`, dan ringkasan akhir belum pernah berjalan sungguhan. Layak dijadikan tiket: sesudah rilis berikutnya terpasang, jalankan rantai kecil berisi dua tiket (satu sengaja dibuat ditolak sekali), lalu catat apakah pengerja dan peninjau yang sama benar-benar dilanjutkan dan ringkasannya lengkap. — **dijadikan tiket [[261011073201]]**
- **Kalimat "the hook asks for a reviewer again" di `foreman.md` kurang tepat**, begitu pula pesan hook mandor yang selalu berbunyi "Dispatch" di putaran kedua. Layak dirapikan supaya mandor tidak mengutus peninjau baru padahal seharusnya melanjutkan peninjau lama. — **dijadikan tiket [[261011073202]]**
