# Sistem Manajemen Mahasiswa Doktor

Sistem manajemen akademik mahasiswa doktor dengan halaman login Admin (username dan password) serta Mahasiswa (NIM dan password). Autentikasi menggunakan MySQL, bcrypt, dan JWT dalam cookie HttpOnly. Admin memiliki sidebar, header, halaman sambutan, serta menu untuk menambah dan melihat akun mahasiswa. Fitur akademik lainnya masih berupa halaman placeholder; mahasiswa melihat konfirmasi sesi sederhana.

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
