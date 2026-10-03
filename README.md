# Sistem Manajemen Mahasiswa Doktor

Sistem manajemen akademik mahasiswa doktor dengan halaman login Admin (username dan password) serta Mahasiswa (NIM dan password). Autentikasi menggunakan MySQL, bcrypt, dan JWT dalam cookie HttpOnly. Admin memiliki sidebar, header, halaman sambutan, serta menu untuk menambah dan melihat akun mahasiswa. Proposal dan Kualifikasi memiliki pengajuan terpadu, pembuatan PDF, unggahan dokumen, serta pemeriksaan Admin. Mahasiswa dapat memperbarui profil dan password. Halaman Dosen dan Ruangan masih berupa placeholder.

## Teknologi dan persyaratan

Frontend: React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router, Axios, TanStack Query, React Hook Form, Zod, Lucide React, dan Inter lokal.

Backend: Node.js, TypeScript, Express 5, Prisma 7, adapter MySQL/MariaDB, MySQL, Zod, CORS, dotenv, bcrypt, jsonwebtoken, cookie-parser, dan express-rate-limit. Kedua aplikasi menggunakan TypeScript strict dan ESLint. Pengujian memakai Node.js Test Runner dan Playwright.

Gunakan Node.js 22.12+ atau 24+ (disarankan 24 LTS), npm, pnpm 11.20.0, dan MySQL 8+. Di PowerShell yang membatasi skrip `.ps1`, gunakan `npm.cmd`, `npx.cmd`, dan `pnpm.cmd`.

## Struktur proyek

Repository ini adalah root proyek `doctor-student-management`; nama folder checkout lokal dapat berbeda. Frontend dan backend berjalan independen, tanpa framework monorepo.

```text
doctor-student-management/
├── AGENTS.md
├── agent.md                         # Dokumen instruksi asli
├── README.md
├── .gitignore
├── package.json                     # Menjalankan kedua server bersamaan
├── pnpm-lock.yaml
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/{ui,layout,forms,common}/
│   │   ├── features/                # auth/ dan students/
│   │   ├── hooks/
│   │   ├── layouts/                 # AdminLayout
│   │   ├── lib/                     # Axios dan QueryClient
│   │   ├── pages/                   # Login, halaman admin, akun mahasiswa
│   │   ├── routes/                  # Routing dengan pembatasan role
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── eslint.config.js
│   └── index.html
└── backend/
    ├── prisma/
    │   ├── schema.prisma            # MySQL, model User dan enum Role
    │   └── migrations/              # Migrasi tabel akun
    ├── src/
    │   ├── config/
    │   ├── middleware/
    │   ├── modules/                 # auth/ dan students/
    │   ├── scripts/                 # Pembuatan akun melalui terminal
    │   ├── routes/
    │   ├── services/
    │   ├── types/
    │   ├── utils/
    │   ├── app.ts
    │   └── server.ts
    ├── .env.example
    ├── prisma.config.ts
    ├── package.json
    ├── package-lock.json
    ├── eslint.config.js
    └── tsconfig.json
```

Direktori kosong disimpan dengan `.gitkeep`. `AGENTS.md` disalin dari dokumen instruksi asli `agent.md`.

## Menjalankan frontend dan backend dengan satu perintah

Untuk checkout baru, pasang dependency dari root repository:

```sh
pnpm install --frozen-lockfile
npm --prefix frontend ci
npm --prefix backend ci
```

Root menggunakan pnpm untuk runner bersama; dependency frontend dan backend tetap mengikuti `package-lock.json` masing-masing. Siapkan environment sesuai bagian di bawah, kemudian jalankan dari root:

```sh
pnpm run dev
```

Perintah tersebut menjalankan Vite di http://localhost:5173/ dan Express di http://localhost:3000/ bersamaan. Log diberi label `frontend` dan `backend`. Tekan `Ctrl+C` untuk menghentikan keduanya. Jika salah satu proses berhenti, proses lainnya juga dihentikan.

Untuk menjalankan hanya satu aplikasi dari root, gunakan `pnpm run dev:frontend` atau `pnpm run dev:backend`. Perintah dari direktori masing-masing aplikasi tetap tersedia.

## Setup dan menjalankan frontend

Dari root repository:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Isi `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Variabel `VITE_*` masuk ke browser, sehingga jangan berisi rahasia. Restart Vite setelah environment berubah. Route `/login` menyediakan pilihan Admin dan Mahasiswa. Route `/` memeriksa sesi melalui `/api/auth/me`; Admin diarahkan ke `/dashboard`, sedangkan pengguna yang belum masuk diarahkan ke login. Tailwind menggunakan plugin Vite, warna dari `AGENTS.md`, dan font Inter yang disajikan secara lokal.

## Membuat database MySQL

Masuk ke MySQL:

```sh
mysql -u root -p
```

Jalankan:

```sql
CREATE DATABASE doctor_student_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Tabel akun akan dibuat oleh migrasi pada langkah Prisma di bawah. NIM disimpan sebagai teks agar nol di awal tetap dipertahankan.

## Setup dan menjalankan backend

Buka terminal lain dari root repository:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Isi `backend/.env`:

```dotenv
PORT=3000
DATABASE_URL=mysql://root:password@localhost:3306/doctor_student_management
FRONTEND_URL=http://localhost:5173
JWT_SECRET=
JWT_EXPIRES_IN=1d
```

Ganti username/password sesuai MySQL lokal. Encode karakter khusus dalam URL, misalnya `@` menjadi `%40`. `FRONTEND_URL` merupakan origin yang diizinkan CORS dan operasi login/logout. File `.env` diabaikan Git; `.env.example` hanya berisi contoh.

Isi `JWT_SECRET` dengan nilai acak minimal 32 karakter. Untuk membuat nilainya secara lokal:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Salin hasilnya ke `JWT_SECRET` dalam `.env`, lalu restart backend. Jangan commit atau membagikan nilai tersebut. `JWT_EXPIRES_IN` mendukung durasi seperti `30m`, `12h`, atau `1d`. Pada HTTPS produksi, gunakan `NODE_ENV=production` agar cookie memakai flag Secure.

```sh
npm run dev
```

Untuk menjalankan hasil build:

```sh
npm run build
npm run start
```

Backend memvalidasi environment melalui Zod. `PORT` dan `FRONTEND_URL` memiliki default lokal. `DATABASE_URL` dan `JWT_SECRET` harus tersedia untuk login; health server tetap dapat dijalankan tanpa keduanya.

## Prisma

Prisma 7 menyimpan provider MySQL di `prisma/schema.prisma`, sedangkan URL berasal dari `DATABASE_URL` melalui `prisma.config.ts`. Adapter MySQL digunakan oleh modul autentikasi untuk mengakses tabel akun.

Dari `backend`:

```sh
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
```

Migrasi membuat tabel `User` dengan role `ADMIN`/`STUDENT`, username/NIM unik, hash password, dan versi sesi. Client dibuat di `src/generated/prisma` dan diabaikan Git. Perintah development, build, typecheck, test, serta pembuatan akun otomatis melakukan generate. Validasi dan generate sendiri tidak menguji koneksi MySQL aktif.

`package.json` backend menetapkan override untuk `mariadb`, `mysql2`, dan `deepmerge-ts` agar dependency transitif Prisma menggunakan versi yang memperbaiki kerentanan audit. Validasi dan generate Prisma telah diperiksa dengan versi tersebut. Pertahankan lockfile dan periksa kembali override saat memperbarui Prisma.

Untuk memeriksa koneksi setelah mengisi environment:

```sh
npx prisma db pull --print
```

Perintah baca ini tidak menulis schema atau mengubah database. Database baru tanpa tabel dapat menghasilkan pesan bahwa database kosong, yang berbeda dari kegagalan koneksi.

Script berikut tersedia untuk tahap berikutnya:

```sh
npm run prisma:migrate -- --name init
npm run prisma:studio
```

Untuk checkout baru, gunakan `prisma:deploy` untuk menerapkan migrasi yang sudah disimpan. `prisma:migrate` digunakan ketika mengembangkan perubahan model baru dan dapat membutuhkan izin membuat shadow database. `pnpm run dev` tidak menjalankan migrasi atau membuat akun otomatis.

## Membuat akun dan login

Setelah environment diisi dan migrasi diterapkan, jalankan dari root repository:

```sh
npm --prefix backend run account:create -- --role ADMIN --identifier admin
npm --prefix backend run account:create -- --role STUDENT --identifier 00123456
```

Ganti identifier sesuai username admin atau NIM mahasiswa yang sebenarnya. Terminal meminta password dan konfirmasinya tanpa menampilkan isi password. Password minimal 8 karakter dan maksimal 72 byte. Perintah hanya membuat akun baru dan menolak username/NIM yang sudah digunakan; tidak mengubah akun lama. Tidak ada akun atau password bawaan.

Username admin dinormalisasi menjadi huruf kecil dan dapat berisi huruf, angka, titik, garis bawah, serta tanda hubung. NIM hanya boleh berisi angka, termasuk nol di awal. Pilih jenis akun yang sesuai pada http://localhost:5173/login.

JWT tidak dikirim ke JavaScript browser atau disimpan di localStorage. Cookie sesi memakai HttpOnly dan SameSite=Lax; flag Secure aktif pada produksi. Backend memeriksa pengguna dan role dari database pada setiap pemeriksaan sesi. Keluar akan mencabut semua sesi akun tersebut. Percobaan login dibatasi 20 per 15 menit per IP; limiter saat ini menggunakan memori satu proses.

| Endpoint autentikasi | Fungsi |
|---|---|
| `POST /api/auth/login` | Masuk dengan `{ role: "ADMIN", username, password }` atau `{ role: "STUDENT", nim, password }` |
| `GET /api/auth/me` | Memeriksa cookie sesi dan mengembalikan akun tanpa hash password |
| `POST /api/auth/logout` | Mencabut sesi dan menghapus cookie |

Request POST login/logout harus membawa header `Origin` yang sesuai `FRONTEND_URL`; Axios browser menanganinya otomatis. Endpoint yang dilindungi memakai middleware `authenticate`, sedangkan endpoint mahasiswa juga memakai `authorize('ADMIN')`.

## Sidebar admin dan akun mahasiswa

Setelah login sebagai Admin, aplikasi membuka `/dashboard` dengan sidebar dan header. Header menampilkan akun aktif, jejak halaman, serta tombol keluar. Sidebar menjadi drawer pada mobile dan dapat ditutup dengan Escape. Menu dan submenu berasal dari satu konfigurasi `frontend/src/components/layout/navigation.ts`:

- Dashboard.
- Mahasiswa: Daftar Mahasiswa dan Tambah Akun.
- Proposal: Isi Form, LOA Conference → Kuitansi Pembayaran, Draft Proposal, dan Lulus Ujian → Transkrip Nilai.
- Kualifikasi: Isi Form Kualifikasi dan Draft Artikel yang Dipublish.
- Dosen dan Ruangan.

Untuk membuat akun mahasiswa melalui aplikasi, buka **Mahasiswa → Tambah Akun**, lalu isi NIM, nama lengkap, jenis kelamin, alamat, tanggal lahir, dan password minimal 8 karakter (maksimal 72 byte), dan konfirmasi password. Akun otomatis mendapat role Mahasiswa; NIM duplikat ditolak. Setelah tersimpan, akun muncul pada daftar mahasiswa dan dapat masuk melalui pilihan Mahasiswa di halaman login. Daftar mendukung pencarian NIM dan pagination.

| Endpoint mahasiswa | Fungsi |
|---|---|
| `GET /api/students?page=1&limit=20&search=` | Daftar akun mahasiswa, hanya untuk Admin |
| `POST /api/students` | Membuat akun dengan `{ nim, fullName, gender, address, birthDate, password }`, hanya untuk Admin |

POST, PATCH, dan DELETE mahasiswa wajib membawa Origin yang sesuai konfigurasi. Backend menetapkan role `STUDENT` dan tidak menerima role dari input. Password maupun hash tidak disertakan pada respons. Halaman Proposal, Kualifikasi, Dosen, dan Ruangan masih berupa placeholder.

Daftar mahasiswa menggunakan komponen reusable `DataTable` dengan konfigurasi kolom, checkbox per baris dan seluruh halaman, indikator urutan, pagination, serta keadaan memuat, gagal, dan kosong. Pilihan baris direset ketika pencarian, filter, urutan, atau halaman berubah. Checkbox hanya memilih data; penghapusan dilakukan per akun melalui dialog konfirmasi.

Pencarian, filter tanggal, sorting, dan pagination diproses oleh MySQL melalui Prisma. `GET /api/students` menerima `page`, `limit` (1–100), `search` (NIM atau nama), `sortBy` (`nim`, `fullName`, atau `createdAt`), `sortOrder` (`asc` atau `desc`), serta `dateFrom`/`dateTo` (YYYY-MM-DD). Rentang tanggal bersifat inklusif berdasarkan Asia/Jakarta. Urutan bawaan adalah tanggal dibuat terbaru; ID digunakan untuk menjaga urutan stabil jika nilainya sama.

`PATCH /api/students/:id` menerima `{ nim, fullName?, gender?, address?, birthDate?, password? }` untuk mengubah NIM dan password opsional. Password kosong pada form tidak dikirim. Setiap perubahan akun mencabut sesi mahasiswa. `DELETE /api/students/:id` menghapus akun setelah konfirmasi pengguna. Kedua endpoint hanya dapat diakses Admin dan hanya menargetkan akun Mahasiswa; NIM duplikat menghasilkan 409 dan akun yang tidak ditemukan menghasilkan 404. Migrasi `20261004000100_add_student_profile` menambahkan kolom profil nullable agar akun lama tetap dapat digunakan. Jalankan `npm --prefix backend run prisma:deploy` pada database lain sebelum menggunakan versi ini.

## URL pengembangan

| Layanan | URL |
|---|---|
| Frontend | http://localhost:5173/ |
| Backend / prefix API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |

Prefix `/api` bukan endpoint tersendiri. `GET /api/health` tetap tersedia:

```json
{
  "success": true,
  "message": "Server berjalan dengan baik."
}
```

Health memeriksa server HTTP, belum memeriksa MySQL. Endpoint tidak terdaftar mengembalikan JSON 404 dalam Bahasa Indonesia.

## Pemeriksaan

Jalankan di masing-masing direktori frontend dan backend:

```sh
npm run typecheck
npm run lint
npm run build
```

Periksa health dari PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Tidak ada aset demo atau counter Vite. Pengembangan fitur dilanjutkan pada tugas berikutnya sesuai `AGENTS.md`.

Pengujian autentikasi dari `backend`:

```sh
npm test
```

Untuk menyertakan pengujian integrasi MySQL di database pengembangan yang sudah dimigrasikan, jalankan melalui PowerShell:

```powershell
$env:AUTH_DATABASE_TESTS='1'
npm test
Remove-Item Env:AUTH_DATABASE_TESTS
```

Tes integrasi membuat akun sementara dengan password acak dan menghapusnya setelah selesai. Tes juga memeriksa bahwa hanya Admin dapat membuat akun mahasiswa, NIM duplikat ditolak, dan mahasiswa yang dibuat dapat login. Pengujian browser dari `frontend`:

```sh
npx playwright install chromium
npm run test:e2e
```

Tes browser menggunakan respons API terkontrol untuk menguji login, sidebar bertingkat, header, drawer mobile, pembuatan akun, NIM duplikat, pembatasan role, dan sesi yang kedaluwarsa. Jika Chrome sudah terpasang, gunakan `$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'` sebelum menjalankan tes tanpa mengunduh Chromium.

## Profil mahasiswa dan kalender

Registrasi melalui aplikasi mewajibkan NIM, nama lengkap (maksimal 150 karakter), jenis kelamin, alamat (maksimal 1000 karakter), dan tanggal lahir. Jenis kelamin disimpan sebagai `MALE`/`FEMALE` dan ditampilkan sebagai Laki-laki/Perempuan. Tanggal lahir dikirim sebagai YYYY-MM-DD, divalidasi di frontend/backend, dan disimpan sebagai MySQL DATE. Tanggal yang tidak valid atau melewati hari ini di Asia/Jakarta ditolak.

Komponen reusable `DatePicker` menampilkan kalender Bahasa Indonesia dengan pilihan bulan/tahun, navigasi bulan, dukungan tahun kabisat, batas tanggal, pengosongan, dan pembatalan. Profil menggunakan `StudentProfileFormFields` yang sama pada form Tambah dan Ubah. Akun lama tampil dengan nama Belum dilengkapi; Admin dapat melengkapi profil melalui Ubah. Script bootstrap terminal masih dapat membuat akun dengan profil kosong.

## Komponen field reusable

Semua halaman memakai `Input`, `Textarea`, `Select`, `InputDate`, `Checkbox`, dan `RadioGroup` dari `frontend/src/components/ui`. Label dan pesan validasi memakai `FormField`. Gaya dasar untuk Input, Textarea, Select, dan tanggal berasal dari `field-styles.ts`, sehingga border, radius, ukuran teks, padding, fokus, keadaan nonaktif, dan validasi konsisten. `Input` mendukung ikon awal dan konten akhir seperti tombol tampilkan password. Ref diteruskan agar tetap mendukung React Hook Form.

`Select` menerima `value`, `options: { value, label, disabled? }[]`, dan `onValueChange`. Menu pilihan memakai popover agar tidak terpotong oleh tabel atau dialog, mengikuti posisi field saat halaman bergulir, serta mendukung tombol panah, Home/End, pencarian lewat keyboard, Enter, Escape, dan klik di luar. Gunakan Controller untuk integrasi Select dengan React Hook Form.

`InputDate` menggunakan kalender DatePicker yang sudah tersedia, menerima tanggal YYYY-MM-DD melalui `value`/`onChange`, dan mendukung batas `min`/`max`. Tanggal lahir serta kedua filter tanggal mahasiswa memakai komponen ini; select bulan/tahun dan data per halaman juga memakai Select yang sama. Pencarian, filter, urutan, dan pagination tetap diproses backend.

## Area mahasiswa dan profil pribadi

Setelah login sebagai Mahasiswa, aplikasi mengarahkan ke `/dashboard`. Sidebar menampilkan Dashboard, Proposal, Kualifikasi, Dosen, Ruangan, serta Profil. Proposal dan Kualifikasi tidak memiliki submenu. Layout menggunakan AcademicLayout bersama agar header, drawer mobile, dan tampilan tetap konsisten. Halaman khusus Admin tetap menolak akses Mahasiswa, termasuk ketika URL dimasukkan langsung. Proposal dan Kualifikasi menggunakan halaman pengajuan terpadu; Dosen dan Ruangan masih memakai placeholder.

Halaman `/profile` menampilkan profil mahasiswa dari `GET /api/profile`. Mahasiswa dapat memperbarui nama lengkap, jenis kelamin, alamat, dan tanggal lahir melalui `PATCH /api/profile`; NIM ditampilkan hanya baca dan tetap dikelola Admin. Seluruh field menggunakan komponen reusable. Setelah tersimpan, nama pada header diperbarui dan sesi tetap aktif.

Backend hanya mengizinkan role STUDENT untuk endpoint profil, mengambil ID dari sesi yang terverifikasi, dan tidak menerima ID target dari request. Body divalidasi secara strict: perubahan ID, NIM, role, atau password ditolak. PATCH memeriksa Origin. Respons tidak menyertakan hash password dan memakai Cache-Control no-store. Tes integrasi MySQL memeriksa bahwa mahasiswa lain tidak berubah, akses Admin ditolak, dan input identitas/role tidak dapat disisipkan. Tidak ada migrasi database tambahan untuk fitur ini.

Mahasiswa dapat mengubah password melalui form Ubah Password di halaman Profil. `PATCH /api/profile/password` menerima `currentPassword`, `newPassword`, dan `confirmPassword`; backend memverifikasi password saat ini, membatasi percobaan, dan menolak password baru yang sama atau konfirmasi yang berbeda. Password baru minimal 8 karakter dan maksimal 72 byte, disimpan menggunakan bcrypt. Setelah berhasil, seluruh sesi akun dicabut dan mahasiswa diarahkan ke login dengan pemberitahuan untuk masuk menggunakan password baru. Endpoint hanya menggunakan identitas mahasiswa dari sesi.

## Pengajuan Proposal dan Kualifikasi terpadu

Requirement pengajuan terbaru menggantikan rancangan submenu akademik pada bagian awal README. Acuan isi formulir adalah `backend/assets/forms/Formulir pendaftaran ujian proposal Disertasi.doc` dan `backend/assets/forms/FORM UJIAN KUALIFIKASI.docx`. File acuan tetap disimpan. PDF Proposal mengisi `backend/assets/forms/proposal-template.pdf`, hasil konversi dokumen Proposal asli menggunakan LibreOffice 24.2.7 dengan Times New Roman dan Calibri. Kop, gambar, teks statis, tabel, ukuran huruf, serta dua halaman dipertahankan. Kontak header berada di kanan kop; bagian telepon, judul, pembimbing, dan persyaratan halaman pertama mengikuti jumlah baris isian sehingga tidak menyisakan baris kosong berlebihan. Section teks asli tersimpan di `proposal-sections.pdf`. Hash dokumen sumber diperiksa terhadap `proposal-template.json`; perubahan dokumen sumber harus disertai pembaruan template. Kualifikasi tetap menggunakan generator sebelumnya. Tanda tangan pembimbing tidak dibuat otomatis.

### Halaman dan sidebar

- Mahasiswa: `/dashboard`, `/proposal`, `/qualification`, `/lecturers`, `/rooms`, `/profile`.
- Admin: `/dashboard`, `/admin/proposals`, `/admin/proposals/:id`, `/admin/qualifications`, `/admin/qualifications/:id`; menu Mahasiswa serta Dosen/Ruangan yang sudah ada tetap tersedia.
- Proposal dan Kualifikasi berupa tautan tunggal tanpa submenu. URL submenu lama milik mahasiswa diarahkan ke halaman pengajuan terpadu. Profil dan ubah password tetap tersedia.

### Flow pengajuan

Proposal mewajibkan Formulir Proposal yang dibuat aplikasi, Kuitansi Pembayaran PDF, Draft Proposal PDF, dan Transkrip Nilai PDF. Kualifikasi mewajibkan Form Kualifikasi yang dibuat aplikasi dan Draft Artikel yang Dipublikasikan PDF. Form memuat kontak, judul, pembimbing, program studi, kota, dan tanggal, dengan identitas dari profil mahasiswa. Date picker dan input memakai komponen reusable.

Mahasiswa dapat menyimpan draft yang belum lengkap. Unggah tanda tangan PNG transparan sebelum membuat PDF. PNG maksimal 2 MB, maksimal 4 juta piksel, memiliki transparansi dan isi terlihat. Backend menormalisasi PNG dan menempatkannya dengan rasio asli dalam area mahasiswa. Proposal memakai zona 160 x 24 pt pada kedua halaman. Pada halaman pertama x=324.1, y=642; pada halaman kedua x=72.1, y=427 (koordinat dari kiri atas). Kualifikasi memakai zona tetap `x=350, y=120, width=160, height=70` pt dari kiri bawah. Request tidak menerima posisi atau ukuran tanda tangan. Sumber PNG tidak menjadi dokumen pengajuan final.

Perubahan isi form atau tanda tangan membatalkan PDF form sebelumnya. Mahasiswa harus membuat ulang PDF. Proposal tetap dua halaman: data yang tidak muat ditolak dengan pesan untuk meringkas isi, tanpa mengubah ukuran huruf atau memotong teks. Kualifikasi mendukung halaman lanjutan untuk data panjang. Setelah semua dokumen lengkap, Kirim Pengajuan aktif. Backend memeriksa ulang kelengkapan dan validitas PDF saat pengiriman.

| Status internal | Label | Hak mahasiswa |
|---|---|---|
| DRAFT | Draft | Ubah, unggah, buat PDF, kirim |
| PENDING | Menunggu Pemeriksaan | Lihat, pratinjau, unduh |
| APPROVED | Disetujui | Lihat, pratinjau, unduh |
| REJECTED | Ditolak | Lihat alasan, perbaiki, unggah, buat ulang PDF, kirim ulang |

Transisi hanya melalui backend: mahasiswa DRAFT/REJECTED ke PENDING, Admin PENDING ke APPROVED/REJECTED. Penolakan wajib disertai alasan. Pengiriman ulang menghapus hasil review sebelumnya. Semua mutasi memakai transaksi ReadCommitted dengan penguncian baris sehingga pengiriman, unggahan, dan review bersamaan tidak melewati aturan status.

### API

Gunakan `{module}` = `proposals` atau `qualifications`:

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/{module}/me` | Pengajuan mahasiswa sendiri; buat draft awal jika belum ada |
| PATCH | `/api/{module}/me` | Simpan isi formulir draft |
| POST | `/api/{module}/me/documents/:type` | Unggah satu file melalui multipart field `file` |
| POST | `/api/{module}/me/generate` | Buat PDF dari form tersimpan dan tanda tangan |
| POST | `/api/{module}/me/submit` | Validasi dan kirim pengajuan |
| GET | `/api/{module}/me/documents/:documentId` | Pratinjau dokumen milik sendiri |
| GET | `/api/admin/{module}` | Daftar dengan search, filter status, sorting, pagination backend |
| GET | `/api/admin/{module}/:id` | Detail pengajuan |
| GET | `/api/admin/{module}/:id/documents/:documentId` | Dokumen pengajuan untuk Admin |
| PATCH | `/api/admin/{module}/:id/review` | `{decision:"APPROVED"}` atau `{decision:"REJECTED",reason:"..."}` |

Jenis unggahan Proposal: PAYMENT_RECEIPT, PROPOSAL_DRAFT, TRANSCRIPT. Kualifikasi: PUBLISHED_ARTICLE_DRAFT. Kedua modul menerima SIGNATURE sebagai sumber PNG. PROPOSAL_FORM/QUALIFICATION_FORM tidak dapat diunggah manual. Daftar mendukung `search`, `status`, `page`, `limit`, `sortBy` (fullName/nim/submittedAt/status), `sortOrder` (asc/desc).

### Pratinjau, penyimpanan, dan review

Komponen `PdfPreview` mengambil file melalui Axios dengan cookie autentikasi, menampilkan blob pada iframe dalam dialog, dan membersihkan URL blob saat ditutup. Unduh PDF mengambil file yang sama tanpa unduhan otomatis. Endpoint file mendukung `?download=1` untuk respons attachment. Endpoint memeriksa role dan ownership; file tidak tersedia melalui static public URL dan tidak mengirim path lokal dalam JSON.

Admin membuka detail, memeriksa semua PDF, lalu Setujui melalui dialog konfirmasi atau Tolak melalui dialog alasan wajib. Tombol pemeriksaan hanya tersedia pada PENDING; backend menerapkan aturan yang sama. Tidak ada pengiriman email.

`MAX_DOCUMENT_SIZE_MB=10` mengatur batas PDF pada backend dan dikirim ke frontend. Backend memeriksa MIME, ekstensi, header, dan keterbacaan PDF serta menolak PDF terenkripsi. `UPLOAD_DIR=uploads` menempatkan file privat di folder backend; database hanya menyimpan metadata. Penggantian dokumen membersihkan file lama setelah transaksi berhasil. Penghapusan akun mahasiswa juga membersihkan berkas pengajuannya. Percobaan unggahan/pembuatan PDF dibatasi per akun.

### Database dan file implementasi

Migrasi `backend/prisma/migrations/20261004000200_add_academic_submissions/migration.sql` menambah Submission, SubmissionDocument, enum jenis/status/dokumen, relasi mahasiswa/pemeriksa, serta indeks. Tidak menghapus tabel atau data lama. Migrasi telah dijalankan pada database lokal. Untuk lingkungan lain:

```sh
npm --prefix backend run prisma:deploy
```

Implementasi utama berada di `backend/src/modules/submissions`, `frontend/src/features/submissions`, `frontend/src/components/common/PdfPreview.tsx`, `frontend/src/components/ui/SubmissionBadge.tsx`, route/navigation, dan halaman dashboard mahasiswa. Generator PDF memakai pdf-lib; validasi PNG memakai sharp; multipart memakai multer.

### Verifikasi

```powershell
$env:AUTH_DATABASE_TESTS='1'
npm --prefix backend test
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
npm --prefix frontend run test:e2e
npm --prefix backend run typecheck
npm --prefix frontend run typecheck
npm --prefix backend run lint
npm --prefix frontend run lint
npm --prefix backend run build
npm --prefix frontend run build
```

Tes integrasi memakai akun sementara dan membersihkan dokumennya. Tes memeriksa kedua flow status, semua unggahan, ukuran/MIME/file palsu, PNG transparan, pembatalan PDF setelah perubahan form, akses dokumen privat, role, origin, filter, serta request kirim/review bersamaan. Tes browser menguji form, PDF, unduhan, kelengkapan, penguncian, alasan penolakan, kirim ulang, review Admin, desktop/mobile, dan regresi profil/password. Fixture PDF browser tersimpan di `frontend/tests/fixtures/sample.pdf`, sehingga tidak bergantung pada output tes backend. Hasil PDF normal dan panjang diperiksa secara visual.

### Font PDF Proposal

Server Windows membaca Times New Roman (`times.ttf`) dan Calibri (`calibri.ttf`) dari folder Fonts Windows. Pada server lain, sediakan kedua font asli dengan izin penggunaan yang sesuai dan atur `PROPOSAL_TIMES_FONT_PATH` serta `PROPOSAL_CALIBRI_FONT_PATH` ke lokasi file. Font pengganti ditolak agar tipografi tetap konsisten. LibreOffice hanya dipakai saat menyiapkan template; tidak diperlukan untuk setiap pembuatan PDF. Berkas font Windows tidak disalin ke repository.

Pembaruan aset Proposal dari PDF ekspor dokumen acuan: `python backend/scripts/prepare-proposal-template.py path/to/export.pdf` (memerlukan PyMuPDF untuk persiapan aset saja). Periksa kedua halaman hasil generate setelah aset diperbarui.

Pada halaman kedua Proposal, kalimat penutup mengikuti jumlah baris judul. Posisi tanggal/tanda tangan dan tabel persetujuan tetap sesuai template. Label `(Nama dan Ttd mahasiswa)` dihapus; nama mahasiswa tetap ditampilkan.
