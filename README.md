# Sistem Manajemen Mahasiswa Doktor

Fondasi aplikasi manajemen akademik mahasiswa doktor. Tahap ini hanya menyediakan lingkungan pengembangan, halaman verifikasi, dan endpoint health. Fitur aplikasi, autentikasi, model database, dan seed belum dibuat.

## Teknologi dan persyaratan

Frontend: React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router, Axios, TanStack Query, React Hook Form, Zod, Lucide React, dan Inter lokal.

Backend: Node.js, TypeScript, Express 5, Prisma 7, adapter MySQL/MariaDB, MySQL, Zod, CORS, dan dotenv. Kedua aplikasi menggunakan TypeScript strict dan ESLint.

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
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/                     # Axios dan QueryClient
│   │   ├── pages/                   # Hanya SetupPage
│   │   ├── routes/                  # Hanya /
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
    │   ├── schema.prisma            # MySQL, tanpa model
    │   └── migrations/              # Masih kosong
    ├── src/
    │   ├── config/
    │   ├── middleware/
    │   ├── modules/
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

Variabel `VITE_*` masuk ke browser, sehingga jangan berisi rahasia. Restart Vite setelah environment berubah. Route `/` berisi halaman verifikasi saja, tanpa query API. TanStack Query provider dan Axios sudah disiapkan. Tailwind menggunakan plugin Vite, warna dari `AGENTS.md`, dan font Inter yang disajikan secara lokal.

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

Database pada tahap ini belum memiliki tabel aplikasi.

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
```

Ganti username/password sesuai MySQL lokal. Encode karakter khusus dalam URL, misalnya `@` menjadi `%40`. `FRONTEND_URL` merupakan origin yang diizinkan CORS. File `.env` diabaikan Git; `.env.example` hanya berisi contoh.

```sh
npm run dev
```

Untuk menjalankan hasil build:

```sh
npm run build
npm run start
```

Backend memvalidasi environment melalui Zod. `PORT` dan `FRONTEND_URL` memiliki default lokal. `DATABASE_URL` boleh belum diisi untuk menjalankan health server, karena belum ada akses database aplikasi; isi sebelum operasi Prisma yang mengakses database.

## Prisma

Prisma 7 menyimpan provider MySQL di `prisma/schema.prisma`, sedangkan URL berasal dari `DATABASE_URL` melalui `prisma.config.ts`. Adapter MySQL telah terpasang untuk pengembangan modul database selanjutnya.

Dari `backend`:

```sh
npm run prisma:validate
npm run prisma:generate
```

Client dibuat di `src/generated/prisma` dan diabaikan Git. Schema sengaja tanpa model. Validasi dan generate tidak menguji koneksi MySQL aktif.

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

Jalankan migrasi setelah model ditambahkan dan database tujuan diperiksa. Migrasi pengembangan dapat membutuhkan izin membuat shadow database. Belum ada migrasi maupun seed yang dijalankan otomatis.

## URL pengembangan

| Layanan | URL |
|---|---|
| Frontend | http://localhost:5173/ |
| Backend / prefix API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |

Prefix `/api` bukan endpoint tersendiri. Satu-satunya endpoint adalah `GET /api/health`:

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
