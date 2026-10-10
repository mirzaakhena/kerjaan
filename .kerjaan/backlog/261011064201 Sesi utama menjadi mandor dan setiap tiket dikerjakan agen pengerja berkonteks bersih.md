---
type: feature
priority: high
review: normal
labels: [skill, agen]
reporter: mirza
assign_to: claude
created: 2026-10-11 06:42:23
updated: 2026-10-11 06:47:39
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
- [ ] Ada agen pengerja khusus di `agents/`, berdampingan dengan
      `kerjaan-reviewer`. Mandor cukup mengirim jalur tiket dan bekal dari
      tiket-tiket sebelumnya. Langkah tetapnya (baca aturan proyek dan tiket,
      kerjakan, ukur, buktikan uji bisa merah, commit, pindah ke `review`,
      lapor ringkas) ada di definisi agennya, tidak ditulis ulang per tiket.
- [ ] SKILL.md menjelaskan sesi utama sebagai mandor dalam setiap kasus,
      juga untuk satu tiket: sesi utama tidak menyunting kode tiket sendiri.
- [ ] Hanya mandor yang memanggil peninjau. Pengerja yang memindah tiket ke
      `review` tidak disuruh hook memanggil peninjau. Bisa diuji dengan
      menjalankan hook dari konteks pengerja dan dari konteks mandor.
- [ ] Tiket yang ditolak peninjau dikembalikan ke pengerja yang sama dengan
      melanjutkannya dari transkripnya (mis. `SendMessage` ke agen itu),
      bukan dengan mengutus pengerja baru dan bukan dengan pengerja yang
      menunggu. Pengerja langsung memperbaiki tanpa membaca ulang tiket atau
      kode dari awal. Putaran ulangnya ditinjau oleh peninjau yang sama,
      yang juga dilanjutkan dari transkripnya. Kalau sesi mandor sudah
      berganti dan pengerja lama tidak bisa dilanjutkan, pengerja baru
      bekerja dari Notes tiket, dan ringkasan rantai menyebut bahwa itu
      terjadi.
- [ ] Rantai berhenti sendiri dan melapor kepada pengguna dalam tiga keadaan:
      ada keputusan milik pengguna (pengerja menulis pertanyaan, pilihan,
      dan rekomendasinya di tiket, tanpa menebak), peninjau menolak tiket
      yang sama dua kali, atau tiket yang menjadi landasan tiket lain tidak
      lolos. Pertanyaan yang tidak menahan pekerjaan tidak menghentikan
      rantai, tetapi tetap tercatat di tiket.
- [ ] Di awal rantai, mandor menanyakan butir yang hanya bisa diperiksa
      manusia: ditunda atau menahan rantai. Kalau ditunda, butir itu ditulis
      sebagai skenario tangan, ditandai "menunggu <pengguna>" di tiket, dan
      peninjau tidak menolak tiket karenanya. Jawaban pengguna dicatat di
      tiket-tiket yang terkena.
- [ ] Mandor meneruskan bekal dari tiket ke tiket: komponen yang sudah
      dibangun, jebakan yang ditemukan, dan pola penolakan sebelumnya. Bekal
      itu sampai ke pengerja berikutnya tanpa pengerja harus membaca riwayat
      sesi mandor.
- [ ] Di akhir rantai, atau saat rantai berhenti, pengguna mendapat satu
      ringkasan: tiket mana yang lolos dan di putaran keberapa, mana yang
      berhenti dan kenapa, serta semua pertanyaan yang terkumpul.
- [ ] `references/parallel-work.md` dan bagian lain yang mengandaikan sesi
      mengerjakan tiketnya sendiri diselaraskan, tanpa saling bertentangan
      dengan SKILL.md.
- [ ] README menjelaskan cara kerja ini kepada pengguna baru.

## History
- 2026-10-11 06:42:23 backlog

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
