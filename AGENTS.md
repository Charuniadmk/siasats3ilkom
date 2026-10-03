# AGENTS.md

## Ringkasan Proyek

Proyek ini adalah aplikasi web **Sistem Manajemen Mahasiswa Doktor** untuk mengelola proses akademik mahasiswa doktor.

Aplikasi memiliki dua peran pengguna:

1. **Admin**
2. **Mahasiswa**

Aplikasi harus memiliki tampilan modern, sederhana, elegan, profesional, dan menggunakan latar belakang dominan putih.

Tampilan harus terasa seperti aplikasi manajemen akademik premium dan bukan seperti template admin generik.

---

# Aturan Bahasa Aplikasi

## WAJIB: Seluruh Aplikasi Menggunakan Bahasa Indonesia

Semua teks yang terlihat oleh pengguna di aplikasi harus menggunakan **Bahasa Indonesia**.

Ini berlaku untuk seluruh frontend dan semua pesan backend yang dikirim kepada frontend.

Jangan menggunakan Bahasa Inggris pada antarmuka pengguna kecuali untuk istilah teknis, nama resmi, nama file, atau istilah akademik yang memang secara umum digunakan dalam Bahasa Inggris.

Contoh istilah yang boleh tetap menggunakan istilah aslinya jika diperlukan:

```text
LOA
Conference
DOI
URL
Email
PDF
```

Namun jika terdapat padanan Bahasa Indonesia yang lebih natural untuk pengguna, prioritaskan Bahasa Indonesia.

---

## Semua Elemen UI Harus Berbahasa Indonesia

Termasuk tetapi tidak terbatas pada:

```text
Judul halaman
Nama menu
Nama submenu
Tombol
Label form
Placeholder
Pesan validasi
Notifikasi
Toast
Dialog konfirmasi
Empty state
Loading state
Error message
Breadcrumb
Tooltip
Judul tabel
Kolom tabel
Filter
Pagination
Status
Dashboard
Modal
Dropdown
Pesan login
Pesan logout
Pesan upload
Pesan sukses
Pesan gagal
```

Contoh:

JANGAN:

```text
Save
Cancel
Delete
Edit
Search
Loading...
No data found
Submit
Back
Next
Previous
Are you sure?
```

Gunakan:

```text
Simpan
Batal
Hapus
Ubah
Cari
Memuat...
Data tidak ditemukan
Kirim
Kembali
Selanjutnya
Sebelumnya
Apakah Anda yakin?
```

---

# Bahasa Untuk Form

Semua label form harus menggunakan Bahasa Indonesia.

Contoh:

```text
Nama Lengkap
Nomor Induk Mahasiswa
Email
Nomor Telepon
Tanggal Lahir
Alamat
Tahun Akademik
Semester
Status Mahasiswa
```

Placeholder juga harus Bahasa Indonesia.

Contoh:

```text
Masukkan nama lengkap
Masukkan alamat email
Pilih semester
Pilih tanggal
Cari mahasiswa...
```

Jangan menggunakan placeholder seperti:

```text
Enter your name
Select status
Search student
Choose file
```

---

# Pesan Validasi

Semua pesan validasi harus Bahasa Indonesia.

Contoh:

```text
Nama lengkap wajib diisi.
Email wajib diisi.
Format email tidak valid.
Password minimal 8 karakter.
Silakan pilih status.
File harus berformat PDF.
Ukuran file maksimal 10 MB.
```

Jangan menampilkan pesan bawaan library dalam Bahasa Inggris kepada pengguna.

Jika Zod, React Hook Form, Prisma, atau library lainnya menghasilkan pesan Bahasa Inggris, ubah pesan tersebut menjadi pesan Bahasa Indonesia sebelum ditampilkan pada UI.

---

# Pesan API

Pesan API yang dapat ditampilkan kepada pengguna juga harus menggunakan Bahasa Indonesia.

Contoh sukses:

```json
{
  "success": true,
  "message": "Data proposal berhasil disimpan."
}
```

Contoh error:

```json
{
  "success": false,
  "message": "Data mahasiswa tidak ditemukan."
}
```

Jangan mengirim pesan seperti:

```text
Student not found
Invalid credentials
Unauthorized
Something went wrong
```

Gunakan:

```text
Mahasiswa tidak ditemukan.
Email atau password tidak sesuai.
Anda tidak memiliki izin untuk mengakses halaman ini.
Terjadi kesalahan pada sistem.
```

---

# Bahasa Dalam Source Code

Nama variabel, fungsi, class, interface, database field, API route, dan nama file **boleh menggunakan Bahasa Inggris** untuk menjaga konsistensi teknis.

Contoh:

```ts
getStudentById()
currentUser
isLoading
ProposalForm
StudentProfile
```

Ini diperbolehkan.

Namun teks yang tampil kepada pengguna tetap harus menggunakan Bahasa Indonesia.

Contoh:

```tsx
<Button>Simpan</Button>
```

bukan:

```tsx
<Button>Save</Button>
```

---

# Konsistensi Istilah

Gunakan istilah yang konsisten di seluruh aplikasi.

Gunakan:

```text
Mahasiswa
Dosen
Ruangan
Proposal
Kualifikasi
Kuitansi Pembayaran
Transkrip Nilai
Draft Proposal
Draft Artikel
Isi Form
Status
Tanggal
Dokumen
Unggah
Unduh
Simpan
Batal
Hapus
Ubah
Detail
Cari
Filter
```

Jangan mencampurkan istilah untuk fitur yang sama.

Contoh:

Jika menggunakan:

```text
Mahasiswa
```

jangan di halaman lain menggunakan:

```text
Student
```

---

# Teknologi

## Frontend

Gunakan:

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React
- Axios
- TanStack Query
- React Hook Form
- Zod

Jangan menggunakan framework UI besar seperti:

- Material UI
- Ant Design

kecuali diminta secara eksplisit.

Bangun komponen UI reusable menggunakan Tailwind CSS.

---

# Backend

Gunakan:

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- MySQL
- Zod
- JWT
- bcrypt

Gunakan REST API.

Arsitektur backend harus modular dan mudah dikembangkan.

---

# Struktur Proyek

Gunakan struktur:

```text
doctor-student-management/
│
├── AGENTS.md
├── README.md
├── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── forms/
│   │   │   └── common/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   └── ...
│
└── backend/
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
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
    └── ...
```

---

# Prinsip Pengembangan

Prioritaskan:

1. Keterbacaan kode
2. Maintainability
3. Reusability
4. Konsistensi UI
5. Type safety
6. Security
7. Arsitektur sederhana

Jangan membuat solusi yang terlalu kompleks jika belum dibutuhkan.

---

# Role

Gunakan dua role:

```text
ADMIN
STUDENT
```

Role internal database boleh tetap menggunakan:

```text
ADMIN
STUDENT
```

Namun pada UI tampilkan:

```text
Admin
Mahasiswa
```

Authorization harus diterapkan di:

- frontend
- backend

Frontend saja tidak cukup untuk keamanan.

---

# Autentikasi

Gunakan JWT.

Login menggunakan:

```text
Email
Password
```

Password harus disimpan menggunakan bcrypt.

JWT minimal berisi:

```ts
{
  userId: string
  role: "ADMIN" | "STUDENT"
}
```

Buat middleware:

```ts
authenticate
authorize
```

Contoh:

```ts
authorize("ADMIN")
```

---

# Struktur Menu

Gunakan menu berikut:

```text
Dashboard

Proposal
├── Isi Form
├── LOA Conference
│   └── Kuitansi Pembayaran
├── Draft Proposal
└── Lulus Ujian
    └── Transkrip Nilai

Kualifikasi
├── Isi Form Kualifikasi
└── Draft Artikel yang Dipublish

Dosen

Ruangan
```

Semua label menu harus menggunakan Bahasa Indonesia seperti di atas.

---

# Dashboard

Dashboard Admin dapat menampilkan:

```text
Total Mahasiswa
Proposal Diajukan
Proposal Menunggu Pemeriksaan
Kualifikasi Diajukan
Total Dosen
Total Ruangan
Aktivitas Terbaru
Pengajuan Terbaru
```

Dashboard Mahasiswa dapat menampilkan:

```text
Status Proposal
Status Kualifikasi
Kelengkapan Dokumen
Dokumen Terbaru
Informasi Terbaru
Aktivitas Akademik
```

---

# Proposal

Menu:

```text
Proposal
├── Isi Form
├── LOA Conference
│   └── Kuitansi Pembayaran
├── Draft Proposal
└── Lulus Ujian
    └── Transkrip Nilai
```

Mahasiswa hanya boleh mengakses data proposal miliknya sendiri.

Admin dapat melihat data proposal seluruh mahasiswa.

---

# Status Proposal

Status internal boleh menggunakan:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REVISION
REJECTED
```

Namun UI harus menerjemahkannya menjadi:

```text
DRAFT → Draft
SUBMITTED → Diajukan
UNDER_REVIEW → Sedang Diperiksa
APPROVED → Disetujui
REVISION → Perlu Revisi
REJECTED → Ditolak
```

Jangan pernah menampilkan enum database mentah kepada pengguna.

---

# LOA Conference

Informasi dapat mencakup:

```text
Nama Conference
Penyelenggara
Lokasi
Tanggal Conference
Nomor LOA
Tanggal LOA
Dokumen LOA
```

Gunakan label Indonesia apabila memungkinkan.

Contoh:

```text
Nama Conference
Penyelenggara
Lokasi Conference
Tanggal Pelaksanaan
Nomor LOA
Tanggal LOA
Dokumen LOA
```

---

# Kuitansi Pembayaran

Data awal:

```text
Tanggal Pembayaran
Nominal Pembayaran
Keterangan
Dokumen Kuitansi
Catatan
```

Untuk upload gunakan label:

```text
Unggah Kuitansi
Pilih File
Dokumen yang Dipilih
```

Jangan gunakan:

```text
Upload Receipt
Choose File
```

---

# Draft Proposal

Mahasiswa dapat:

- mengunggah draft proposal
- memperbarui draft proposal
- melihat dokumen
- melihat tanggal unggah
- menambahkan catatan

Gunakan teks UI seperti:

```text
Unggah Draft Proposal
Perbarui Draft
Lihat Dokumen
Unduh Dokumen
Tanggal Unggah
Catatan
```

---

# Lulus Ujian

Bagian ini digunakan untuk informasi mahasiswa yang sudah melewati tahapan ujian terkait proposal.

Status akademik tidak boleh otomatis berubah hanya berdasarkan upload dokumen.

---

# Transkrip Nilai

Mahasiswa dapat mengunggah transkrip nilai.

Gunakan label:

```text
Transkrip Nilai
Unggah Transkrip
Dokumen Transkrip
Tanggal Unggah
Catatan
```

---

# Kualifikasi

Menu:

```text
Kualifikasi
├── Isi Form Kualifikasi
└── Draft Artikel yang Dipublish
```

Mahasiswa hanya dapat melihat dan mengubah data miliknya sendiri.

Admin dapat melihat data seluruh mahasiswa.

---

# Status Kualifikasi

Backend boleh menggunakan:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REVISION
REJECTED
```

Tampilan UI:

```text
Draft
Diajukan
Sedang Diperiksa
Disetujui
Perlu Revisi
Ditolak
```

---

# Draft Artikel yang Dipublish

Informasi dapat mencakup:

```text
Judul Artikel
Nama Jurnal / Conference
Jenis Publikasi
Status Publikasi
URL Artikel
DOI
Tanggal Publikasi
Dokumen Artikel
Catatan
```

Status internal:

```text
DRAFT
SUBMITTED
ACCEPTED
PUBLISHED
```

Tampilan UI:

```text
Draft
Diajukan
Diterima
Dipublikasikan
```

---

# Dosen

Mahasiswa:

```text
Hanya melihat data
```

Admin:

```text
Tambah
Lihat
Ubah
Hapus
```

Data awal:

```text
Kode Dosen
Nama Lengkap
Email
Nomor Telepon
Gelar Akademik
Program Studi / Departemen
Bidang Keahlian
Status
```

---

# Ruangan

Mahasiswa:

```text
Hanya melihat data
```

Admin:

```text
Tambah
Lihat
Ubah
Hapus
```

Data awal:

```text
Kode Ruangan
Nama Ruangan
Gedung
Lantai
Kapasitas
Deskripsi
Status
```

---

# Hak Akses

| Fitur | Admin | Mahasiswa |
|---|---|---|
| Dashboard | Semua data | Data pribadi |
| Proposal | Semua mahasiswa | Data sendiri |
| LOA Conference | Semua mahasiswa | Data sendiri |
| Kuitansi Pembayaran | Semua mahasiswa | Data sendiri |
| Draft Proposal | Semua mahasiswa | Data sendiri |
| Lulus Ujian | Semua mahasiswa | Data sendiri |
| Transkrip Nilai | Semua mahasiswa | Data sendiri |
| Kualifikasi | Semua mahasiswa | Data sendiri |
| Draft Artikel | Semua mahasiswa | Data sendiri |
| Dosen | CRUD | Lihat |
| Ruangan | CRUD | Lihat |

Backend harus melakukan ownership validation.

Mahasiswa tidak boleh dapat mengakses data mahasiswa lain dengan mengubah URL atau request API.

---

# Desain UI

Gunakan:

- background putih
- tampilan minimalis
- elegan
- modern
- profesional
- whitespace yang cukup
- border tipis
- shadow sangat halus
- rounded corner
- aksen biru secukupnya

Hindari:

- terlalu banyak gradient
- warna berlebihan
- card dengan shadow berat
- animasi berlebihan
- desain seperti template admin Bootstrap lama

---

# Warna

Background utama:

```text
#FFFFFF
```

Background sekunder:

```text
#F8FAFC
```

Teks utama:

```text
#0F172A
```

Teks sekunder:

```text
#64748B
```

Border:

```text
#E2E8F0
```

Aksen:

```text
#2563EB
```

Sukses:

```text
#16A34A
```

Peringatan:

```text
#D97706
```

Error:

```text
#DC2626
```

---

# Typography

Gunakan font modern seperti:

```text
Inter
```

Contoh:

```text
Judul halaman:
text-2xl font-semibold

Judul bagian:
text-lg font-semibold

Isi:
text-sm atau text-base

Teks sekunder:
text-sm text-slate-500
```

---

# Komponen UI

Buat komponen reusable:

```text
Button
Input
Select
Textarea
Checkbox
Badge
Card
Modal
Dialog
Dropdown
Table
Pagination
Breadcrumb
PageHeader
EmptyState
LoadingSpinner
Skeleton
```

Nama komponen source code boleh Bahasa Inggris.

Isi yang terlihat pengguna harus Bahasa Indonesia.

---

# Tombol

Gunakan label seperti:

```text
Simpan
Simpan Draft
Kirim
Batal
Ubah
Hapus
Lihat Detail
Kembali
Selanjutnya
Sebelumnya
Unggah Dokumen
Unduh
Tambah Data
```

---

# Tabel

Tabel admin harus mendukung pengembangan untuk:

- pencarian
- pagination
- sorting
- filter
- tindakan
- loading state
- empty state

Contoh kolom:

```text
Nama Mahasiswa
NIM
Status Proposal
Status Kualifikasi
Tanggal Pengajuan
Tindakan
```

Gunakan:

```text
Tindakan
```

bukan:

```text
Actions
```

---

# Empty State

Gunakan Bahasa Indonesia.

Contoh:

```text
Belum ada data mahasiswa.

Data mahasiswa akan muncul setelah data ditambahkan.
```

Contoh lain:

```text
Belum ada proposal yang diajukan.
```

---

# Loading State

Gunakan:

```text
Memuat data...
Menyimpan...
Mengunggah...
Memproses...
```

Bukan:

```text
Loading...
Saving...
Uploading...
Processing...
```

---

# Dialog Konfirmasi

Contoh:

```text
Hapus Data

Apakah Anda yakin ingin menghapus data ini?
Tindakan ini tidak dapat dibatalkan.

Batal
Hapus
```

---

# Toast

Contoh sukses:

```text
Data berhasil disimpan.
Proposal berhasil diajukan.
Dokumen berhasil diunggah.
Data dosen berhasil diperbarui.
```

Contoh error:

```text
Gagal menyimpan data.
Gagal mengunggah dokumen.
Terjadi kesalahan. Silakan coba kembali.
```

---

# API

Base API:

```text
/api
```

Contoh:

```text
POST /api/auth/login
GET /api/auth/me

GET /api/students
GET /api/students/:id

GET /api/proposals
POST /api/proposals

GET /api/qualifications
POST /api/qualifications

GET /api/lecturers
POST /api/lecturers

GET /api/rooms
POST /api/rooms
```

Route API tetap boleh Bahasa Inggris.

---

# Format Respons API

Sukses:

```json
{
  "success": true,
  "message": "Data berhasil disimpan.",
  "data": {}
}
```

Collection:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Data tidak ditemukan."
}
```

---

# Database

Gunakan:

```text
MySQL
Prisma ORM
```

Database credentials harus berasal dari environment variable.

```env
DATABASE_URL="mysql://username:password@localhost:3306/doctor_student_management"
```

---

# File Upload

Jangan menyimpan file binary langsung di MySQL.

Database hanya menyimpan metadata seperti:

```text
fileName
filePath
fileUrl
mimeType
fileSize
uploadedAt
```

Nama field database boleh Bahasa Inggris.

UI tetap Bahasa Indonesia.

---

# Environment Variable

Frontend:

```env
VITE_API_URL=http://localhost:3000/api
```

Backend:

```env
PORT=3000
DATABASE_URL=mysql://root:password@localhost:3306/doctor_student_management
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

---

# Keamanan

Selalu perhatikan:

- hashing password
- authentication
- authorization
- ownership data
- validasi input
- CORS
- environment variable
- keamanan upload file
- keamanan API

Password hash tidak boleh pernah dikirim melalui API.

Mahasiswa hanya boleh mengakses data akademik miliknya sendiri.

---

# Responsive Design

Aplikasi harus dapat digunakan pada:

- desktop
- laptop
- tablet
- mobile

Desktop menjadi pengalaman utama untuk Admin.

Sidebar pada mobile berubah menjadi drawer.

---

# Sidebar

Gunakan satu konfigurasi navigation.

Contoh:

```ts
export const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "STUDENT"],
  },
  {
    label: "Proposal",
    icon: FileText,
    roles: ["ADMIN", "STUDENT"],
    children: [
      {
        label: "Isi Form",
        path: "/proposal/form",
      },
      {
        label: "LOA Conference",
        path: "/proposal/loa-conference",
        children: [
          {
            label: "Kuitansi Pembayaran",
            path: "/proposal/loa-conference/payment-receipt",
          },
        ],
      },
      {
        label: "Draft Proposal",
        path: "/proposal/draft",
      },
      {
        label: "Lulus Ujian",
        path: "/proposal/passed-exam",
        children: [
          {
            label: "Transkrip Nilai",
            path: "/proposal/passed-exam/transcript",
          },
        ],
      },
    ],
  },
  {
    label: "Kualifikasi",
    icon: GraduationCap,
    roles: ["ADMIN", "STUDENT"],
    children: [
      {
        label: "Isi Form Kualifikasi",
        path: "/qualification/form",
      },
      {
        label: "Draft Artikel yang Dipublish",
        path: "/qualification/article",
      },
    ],
  },
  {
    label: "Dosen",
    path: "/lecturers",
    icon: UserRoundCheck,
    roles: ["ADMIN", "STUDENT"],
  },
  {
    label: "Ruangan",
    path: "/rooms",
    icon: DoorOpen,
    roles: ["ADMIN", "STUDENT"],
  },
];
```

---

# Route Frontend

Gunakan route awal:

```text
/login

/dashboard

/proposal/form

/proposal/loa-conference
/proposal/loa-conference/payment-receipt

/proposal/draft

/proposal/passed-exam
/proposal/passed-exam/transcript

/qualification/form
/qualification/article

/lecturers

/rooms
```

---

# Naming Source Code

Component:

```text
PascalCase
```

Contoh:

```text
StudentTable.tsx
ProposalForm.tsx
LecturerTable.tsx
RoomForm.tsx
```

Function:

```text
camelCase
```

Database model:

```text
PascalCase
```

Konstanta:

```text
UPPER_SNAKE_CASE
```

---

# Aturan Codex

Setiap kali mengerjakan task:

1. Baca `AGENTS.md`.
2. Periksa struktur project yang sudah ada.
3. Jangan mengubah arsitektur tanpa alasan kuat.
4. Gunakan komponen reusable yang sudah tersedia.
5. Jangan membuat dependency yang tidak diperlukan.
6. Jangan mengubah fitur lain yang tidak berhubungan.
7. Pertahankan desain yang konsisten.
8. Pastikan authorization backend tetap berjalan.
9. Jalankan TypeScript check.
10. Jalankan lint.
11. Jalankan build bila relevan.

---

# Aturan Bahasa untuk Codex

Sebelum menyelesaikan sebuah fitur, lakukan pemeriksaan khusus bahasa.

Pastikan tidak ada teks UI Bahasa Inggris yang tidak disengaja.

Periksa:

```text
Button
Form
Modal
Dialog
Toast
Table
Breadcrumb
Sidebar
Header
Dashboard
Empty State
Loading State
Error State
Validation
Pagination
Filter
Search
Upload
Login
Logout
```

Jika ditemukan teks Bahasa Inggris yang terlihat pengguna, ubah menjadi Bahasa Indonesia.

---

# Pengecualian Bahasa

Bahasa Inggris masih diperbolehkan untuk:

```text
Nama source code
Nama function
Nama variable
Nama interface
Nama type
Nama database field
Nama API route
Nama package
Nama library
Nama teknologi
Komentar teknis jika diperlukan
```

Tetapi semua bagian yang terlihat pengguna harus Bahasa Indonesia.

---

# Prioritas Implementasi

Urutan pengembangan:

```text
1. Setup project
2. Design system
3. Layout
4. Login dan authentication
5. Role authorization
6. Sidebar
7. Dashboard
8. Proposal
9. Kualifikasi
10. Dosen
11. Ruangan
```

---

# MVP Awal

MVP pertama:

```text
Login

Dashboard

Proposal
- Isi Form
- LOA Conference
- Kuitansi Pembayaran
- Draft Proposal
- Lulus Ujian
- Transkrip Nilai

Kualifikasi
- Isi Form Kualifikasi
- Draft Artikel yang Dipublish

Dosen

Ruangan
```

Untuk tahap awal, halaman yang belum memiliki business logic dapat menggunakan placeholder.

Placeholder tetap harus menggunakan Bahasa Indonesia.

Contoh:

```text
Draft Proposal

Fitur ini sedang dalam tahap pengembangan.
```

Bukan:

```text
Coming Soon
```

---

# Aturan Penting

Seluruh aplikasi yang terlihat oleh pengguna harus menggunakan **Bahasa Indonesia secara konsisten**.

Jika terdapat pilihan antara Bahasa Inggris dan Bahasa Indonesia untuk sebuah teks UI, selalu pilih Bahasa Indonesia.

Jangan mencampurkan Bahasa Inggris dan Bahasa Indonesia dalam satu halaman tanpa alasan yang jelas.

Source code tetap dapat menggunakan konvensi Bahasa Inggris agar maintainable.

Target akhirnya adalah:

**codebase teknis yang bersih menggunakan konvensi pemrograman standar, tetapi pengalaman pengguna sepenuhnya menggunakan Bahasa Indonesia.**