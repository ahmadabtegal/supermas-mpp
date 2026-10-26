# Super Mas — Surat Peminjaman Ruang MPP Alaya Sewagati

Paket awal aplikasi peminjaman ruang dengan frontend GitHub Pages, backend Google Apps Script, database Google Sheets, dan notifikasi WhatsApp melalui Fonnte.

## Isi paket
- `Database_Peminjaman_Ruang_MPP.xlsx` — template struktur database untuk diimpor ke Google Sheets.
- `Code.gs` — backend API Apps Script.
- `index.html` — frontend untuk GitHub Pages.
- `README.md` — panduan instalasi.

## 1. Buat database Google Sheets
1. Upload `Database_Peminjaman_Ruang_MPP.xlsx` ke Google Drive.
2. Buka file dengan Google Sheets dan pastikan tab `Peminjaman`, `Pengaturan`, dan `LogAktivitas` tersedia.
3. Salin ID spreadsheet dari URL: `https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/edit`.
4. Pada `Code.gs`, isi `APP.SHEET_BOOK_ID` dengan ID tersebut. Alternatif: tambahkan Script Property `SPREADSHEET_ID` dengan ID spreadsheet.
5. Buka Extensions → Apps Script, tempel isi `Code.gs`, simpan, lalu jalankan `setupDatabase()` sekali. Berikan izin yang diminta.

## 2. Konfigurasi Fonnte (token jangan ditaruh di GitHub atau HTML)
Di Apps Script: Project Settings → Script Properties, tambahkan:
- `FONNTE_TOKEN` = token Fonnte Anda
- `ADMIN_KEY` = kata sandi admin yang panjang dan unik
- `SPREADSHEET_ID` = ID spreadsheet (jika tidak mengisi `APP.SHEET_BOOK_ID`)

Pada tab `Pengaturan`, isi `WA_ADMIN` dengan nomor admin format `628xxxxxxxxxx`. Setelah itu, jalankan `testFonnte()` untuk tes pesan. Pastikan akun/nomor WhatsApp Fonnte sudah tersambung dan paket/kuota tersedia.

## 3. Deploy backend Apps Script
1. Apps Script → Deploy → New deployment → pilih `Web app`.
2. Execute as: `Me`.
3. Who has access: `Anyone` (endpoint publik diperlukan untuk formulir publik; gunakan validasi dan batasi fungsi admin dengan `ADMIN_KEY`).
4. Deploy, salin URL yang berakhiran `/exec`.
5. Tambahkan izin OAuth `https://www.googleapis.com/auth/script.external_request` jika diminta untuk `UrlFetchApp`; akses Sheets juga akan diminta saat menjalankan setup.
6. Tempel URL tersebut ke konstanta `API_URL` di bagian bawah `index.html`.
7. Jika mengubah `Code.gs`, buat versi deployment baru (Deploy → Manage deployments → Edit → New version).

## 4. Hosting frontend di GitHub Pages
1. Buat repository GitHub, misalnya `super-mas-peminjaman-ruang`.
2. Upload `index.html` ke root repository.
3. Buka Settings → Pages → Deploy from a branch → branch `main`, folder `/(root)`.
4. Buka URL GitHub Pages yang ditampilkan.

## 5. Menu kalender, daftar ruang, dan statistik
- Frontend memanggil aksi `publicSchedule` untuk menampilkan kalender dan statistik publik.
- Setelah mengubah `Code.gs`, deploy ulang sebagai versi baru Apps Script.
- Tambahkan foto ruang asli ke folder `assets` dengan nama `ruang-pertemuan.jpg`, `ruang-konsultasi.jpg`, dan `ruang-serbaguna.jpg`, lalu commit ke GitHub.
- Kalender publik menampilkan nama ruang, waktu, dan status permohonan; pertimbangkan kebijakan publikasi jadwal dan jangan menampilkan data pribadi pemohon.

## 6. Fitur awal
- Formulir pengajuan peminjaman ruang.
- Menu Jadwal Peminjaman berupa kalender bulanan dan tabel jadwal.
- Menu Daftar Ruang dengan slot foto di folder `assets` (ganti placeholder dengan foto asli).
- Menu Statistik Peminjaman Ruang dari data permohonan.
- Data disimpan ke Google Sheets.
- Pemeriksaan benturan jadwal untuk ruang dan tanggal yang sama.
- Notifikasi WhatsApp ke pemohon dan admin melalui Fonnte.
- API status/admin tersedia di backend; `ADMIN_KEY` harus disimpan sebagai Script Property dan tidak boleh ditanam pada halaman publik.

## Catatan penting sebelum digunakan resmi
- Ini adalah starter MVP. Belum ada halaman admin visual; perubahan status dapat dilakukan melalui integrasi/API yang diautentikasi atau langsung melalui Google Sheets. Jangan membagikan `ADMIN_KEY`.
- Untuk penggunaan produksi, tambahkan CAPTCHA/rate limiting, validasi nomor/ tanggal lebih ketat, pengelolaan peran admin, kebijakan privasi, dan prosedur pengarsipan.
- Pastikan nama ruang, kapasitas, jam operasional, persyaratan, format nomor surat, dan alur persetujuan disesuaikan dengan SOP MPP.
- `doPost` menggunakan ContentService JSON. Frontend memakai `text/plain` untuk menghindari preflight CORS dari browser.
- Token Fonnte tidak boleh diletakkan di `index.html`, GitHub, atau sheet yang dibagikan.

## Logo, favicon, dan tombol konsultasi WhatsApp
- Logo disimpan di `assets/supermas.png`; file ini digunakan pada header, favicon, dan ikon Apple touch.
- Tombol WhatsApp mengambang berada di pojok kanan bawah.
- Pada `index.html`, ganti nilai `WA_CONSULT_NUMBER` dengan nomor WhatsApp resmi pengelola berformat internasional tanpa tanda plus, misalnya `628xxxxxxxxxx`.
- Pastikan folder `assets` beserta `supermas.png` ikut diunggah ke repository GitHub Pages; path harus tetap `assets/supermas.png`.

## Pengelolaan Daftar Ruang melalui admin
- Database memiliki sheet baru `Ruang` dengan kolom ID, nama, deskripsi, kapasitas, fasilitas, URL foto, status aktif, dan urutan.
- Jalankan ulang `setupDatabase()` setelah memperbarui `Code.gs`. Fungsi ini membuat sheet Ruang dan data contoh bila sheet belum memiliki data.
- Set Script Property `ADMIN_KEY` dengan kunci rahasia yang kuat. Jangan bagikan kunci ini.
- Di website, buka menu **Admin Ruang**, masukkan `ADMIN_KEY`, lalu muat data untuk mengedit, menambah, atau menonaktifkan ruang.
- Foto disimpan sebagai URL gambar publik; tidak diunggah langsung dari formulir. Unggah foto ke folder `assets` pada GitHub, lalu isi URL GitHub Pages di kolom Foto URL.
- Perbarui deployment Apps Script ke versi baru dan unggah file `index.html` serta folder `assets` ke GitHub Pages.
