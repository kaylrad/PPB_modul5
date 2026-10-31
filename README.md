# Bore & Barrel

A dummy gunshop storefront built as a Progressive Web App. It runs offline
with an app shell, a web app manifest, and a service worker, and uses React +
Vite + Tailwind CSS.

## Setup

```bash
npm ci
```

Salin `.env.example` menjadi `.env` di folder ini. Konfigurasi contoh menggunakan
Supabase yang disediakan Modul 5 (PostgreSQL melalui REST API dan Storage).
Publishable key adalah key untuk frontend; jangan gunakan service role key.

```bash
npm run dev      # dev server with HMR
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
npm test         # service requests and localStorage draft checks
```

## Percobaan Modul 5

Implementasi mencakup konfigurasi Axios dan interceptor, hooks produk/ulasan/favorit,
services CRUD, upload gambar, profil lokal, pencarian/filter/sort, draft localStorage,
manifest, service worker, dan tombol pemasangan PWA. Dependensi berada di folder
repository ini agar instalasi dari GitHub tidak bergantung pada folder induk.

Endpoint Supabase yang dipakai:

| Fitur | Endpoint |
| --- | --- |
| Produk GET/POST/PATCH/DELETE | `/rest/v1/products` |
| Favorit GET/POST/DELETE | `/rest/v1/favorites` |
| Ulasan GET/POST/PATCH/DELETE | `/rest/v1/reviews` |
| Upload | `/storage/v1/object/guns/<nama-file>` |

Saat API gagal, katalog contoh dan favorit lokal tersedia. Draft autosave tersimpan di browser dan dapat disinkronkan ke database akun;
profil nama/bio tersimpan di database akun. Upload menggunakan data URL jika bucket tidak dapat diakses, sesuai
fallback pada percobaan. Data URL bukan bukti file telah tersimpan di Storage.

Verifikasi otomatis `npm test` memeriksa pembentukan request CRUD, sort,
favorit, ulasan, dan pemisahan/penghapusan draft menggunakan mock request.
Pengujian ini tidak mengubah database praktikum bersama.

## Deploy ke Vercel

1. Login ke Vercel dengan GitHub dan import `kaylrad/PPB_modul5`.
2. Gunakan framework **Vite**, Root Directory **./**, Build Command
   **npm run build**, dan Output Directory **dist**.
3. Tambahkan kedua environment variable dari `.env.example` di pengaturan
   environment Vercel. `.env` lokal tidak diunggah ke GitHub.
4. Deploy, lalu buka domain HTTPS yang dihasilkan. Jika environment diubah
   setelah deployment, lakukan redeploy agar Vite membacanya saat build.

## Pemeriksaan akhir di browser dan HP

1. Buka katalog dan pastikan request produk mengarah ke Supabase dan berstatus 200.
2. Buat satu produk uji, ubah, lalu hapus produk uji itu sendiri. Uji favorit dan
   ulasan pada produk uji; jangan mengubah data milik praktikan lain.
3. Simpan draft, muat ulang halaman, lalu pulihkan draft. Periksa profil tetap
   tersimpan setelah reload.
4. Pada hasil build/website HTTPS, periksa Manifest dan Service Workers di
   DevTools. Buka sekali saat online, lalu uji offline dan reload.
5. Buka URL deployment di HP, pilih **Install app** atau **Add to Home Screen**,
   lalu jalankan dari ikon di home screen. Simpan screenshot sebagai bukti
   percobaan deployment dan pemasangan sesuai modul.

Deployment dan pemasangan di perangkat fisik perlu diverifikasi secara terpisah;
build lokal yang berhasil belum membuktikan kedua langkah tersebut selesai.

## Structure

```
.
├── index.html              # HTML shell
├── vite.config.js          # Vite + vite-plugin-pwa (manifest + service worker)
├── public/                 # static assets served at /
│   ├── icon-192.png / icon-512.png / icon.svg
│   └── guns/               # product images
└── src/
    ├── main.jsx            # entry, mounts <App/>
    ├── App.jsx             # app shell: tab state, header/nav/content/footer
    ├── App.css             # app shell styles
    ├── index.css           # global styles
    ├── components/
    │   ├── Header.jsx      # brand + nav
    │   ├── GunCard.jsx     # single product card
    │   └── Footer.jsx
    ├── data/
    │   └── guns.js         # dummy product data
    └── pages/
        ├── Catalog.jsx     # product grid
        ├── About.jsx
        └── Contact.jsx
```

## Fitur tambahan (31 Oktober 2026)

Tema gun dan struktur React/Vite/PWA dipertahankan. Tidak ada form login:
Supabase Anonymous Sign-Ins membuat identitas tamu per origin/browser. Sesi
existing digunakan kembali. Membersihkan data browser atau berganti domain/
perangkat membuat identitas berbeda; identitas tamu tidak dipulihkan lintas perangkat.

| Poin | Implementasi aktif |
| --- | --- |
| 1 | Share pada kartu/detail menghasilkan URL `#item/ID`, tombol salin dan kolom URL. Direct link, reload dan navigasi kembali didukung; ID lokal tidak dibagikan. |
| 2 | React.lazy/Suspense untuk halaman; gambar kartu lazy; ErrorBoundary untuk kegagalan pemuatan. |
| 3 | TanStack Query: staleTime 60 detik, gcTime 5 menit, deduplikasi request, invalidation setelah perubahan. |
| 4 | About/Contact hanya di section Informasi pada Profile; URL langsung tetap tersedia. |
| 5 | Draft lokal dan database digabung menurut versi terbaru, hanya untuk identitas aktif. Seluruh halaman hasil database dimuat. Autosave lokal, sinkronisasi cloud melalui tombol Profile. |
| 6 | Arsip draft, katalog pribadi dan review tersedia di Profile, dengan pemulihan. Arsip tidak masuk daftar aktif; tidak ada tombol hapus permanen. |
| 7 | Review baru mendukung create/read/update/soft delete/restore, rating 1–5, thumbs up/down, pembatalan/penggantian vote. Pemilik ditetapkan dari sesi; RLS menolak perubahan milik orang lain dan vote sendiri. |
| 8 | Edit Profile terpisah menyimpan nama (2–60 karakter) dan bio (maksimal 500) ke database; tampilan Profile diperbarui setelah simpan. |
| 9 | Cart/checkout WhatsApp untuk transaksi senjata api tidak diimplementasikan. |

### Database dan batas akses

Katalog/favorit/upload lama tetap menggunakan konfigurasi `VITE_API_BASE_URL`
dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari proyek praktikum. Akun pemilik aplikasi
tidak mempunyai akses admin proyek sumber itu. Fitur privat memakai proyek
Supabase sendiri melalui `VITE_ACCOUNT_API_URL` dan `VITE_ACCOUNT_PUBLISHABLE_KEY`.
Simpan konfigurasi di `.env` dan Vercel Production/Preview; jangan memakai secret
key, service role key atau database password pada frontend.

Tabel akun: `merch_profiles` (nama backend dipertahankan), `account_drafts`,
`catalog_archives`, `catalog_reviews`, `catalog_review_votes`. RLS tetap berlaku
untuk sesi tamu melalui `auth.uid()`. Arsip katalog adalah penanda **pribadi**,
bukan penghapusan data sumber bersama. ID item menjadi referensi eksternal ke
API sumber, sehingga tidak ada foreign key lintas proyek Supabase.

Review lama dari server praktikum tetap ditampilkan baca-saja karena pemilik
identitas lamanya tidak dapat diverifikasi. Review baru tersimpan di database
sendiri; maksimum satu review aktif per identitas/item. Setiap identitas hanya
mempunyai satu vote per review, tanpa vote sendiri. Identitas tamu dapat dibuat
ulang dengan browser baru, sehingga ini bukan sistem anti-Sybil untuk pemungutan
suara publik. Keamanan RLS membatasi operasi per identitas, bukan per orang.

### Migrasi

- `supabase/migrations/20261031_account_profiles.sql`: profil dan pembatasan pemilik.
- `supabase/migrations/20261031_account_drafts.sql`: draft privat, RPC sinkronisasi,
  batas payload 1 MB dan perlindungan terhadap penimpaan versi lebih baru.
- `supabase/migrations/20261031_catalog_interactions.sql`: tiga tabel baru, indeks,
  RLS, trigger identitas immutable dan privilege terbatas. Tidak menghapus data
  katalog lama. Sudah dijalankan dengan persetujuan pengguna; jangan jalankan ulang
  migration yang sama pada database aktif.

`deleted_at` menyembunyikan review, `archived_at` menyembunyikan draft/katalog
pribadi. Review yang dihapus bisa dipulihkan di Profile → Arsip review saya.
Jika sudah ada review aktif baru pada item yang sama, arsipkan review aktif
terlebih dahulu sebelum memulihkan yang lama.

### Pengujian

`npm test` memeriksa regresi service lama, query cache, sesi tamu, profil,
draft beserta pagination, URL detail, arsip dan service review/vote dengan mock.
`npm run lint` dan `npm run build` digunakan untuk pemeriksaan kode dan produksi.

Pengujian langsung Supabase: `supabase/tests/account_drafts_rls.sql` dan
`supabase/tests/catalog_interactions_rls.sql`. Transaksi fixture diakhiri ROLLBACK;
tidak meninggalkan akun uji. Lulus isolasi pemilik, anti-spoofing, validasi,
soft delete/restore, identitas immutable, satu vote per identitas, serta
penolakan DELETE/TRUNCATE pada tabel interaksi baru.

Pengujian browser lokal: profil/draft tanpa login (pengujian sebelumnya), URL
detail/copy/share, create/edit/soft delete/restore review, thumbs up/down dan
toggle dari origin kedua, vote tetap tersimpan setelah reload, serta arsip
katalog (hilang dari daftar) dan pemulihan. Item sumber tidak diubah; review QA
tersimpan di arsip pribadi dan vote uji dibatalkan. Penghapusan browser akan
menghilangkan akses ke identitas tamu itu. Dua warning lint lama pada
`useFavorites` dan `useReviews` masih ada; tidak ada error lint.

Pemeriksaan ukuran viewport ponsel belum dapat diverifikasi karena browser uji
mempertahankan ukuran desktop meskipun override diminta. Tidak ada klaim lulus
pengujian ponsel khusus untuk perubahan ini.

## Delete draft dan arsip

Profile menyediakan tombol Delete pada draft aktif, arsip draft, arsip katalog
pribadi dan arsip review. Dialog konfirmasi memindahkan data ke section Sampah
masing-masing. Pulihkan dari Sampah mengembalikan draft ke daftar/arsip asal,
atau mengembalikan katalog/review ke arsip sebelum dipulihkan ke daftar aktif.
Tidak ada penghapusan permanen.

Draft menyimpan `trashedAt` di payload JSON melalui RPC privat yang sama. Saat
form dipakai untuk draft baru, versi yang sudah di-delete disalin dengan ID
terpisah agar tetap tersedia di Sampah. Pemulihan versi lama ditolak jika form
sudah memiliki draft lain; pindahkan draft tersebut ke Sampah terlebih dahulu.
Salinan lokal hasil autosave tetap membutuhkan sinkronisasi cloud dari Profile.

Migrasi tambahan `supabase/migrations/20261031_profile_trash.sql` menambah kolom
`trashed_at` pada katalog privat/review serta constraint agar item Sampah tetap
berstatus arsip. Migrasi sudah diterapkan; tidak mengubah RLS atau privilege.
Uji langsung `supabase/tests/profile_trash_rls.sql` lulus dengan ROLLBACK fixture:
retensi payload, isolasi pemilik, pemulihan, dan penolakan item Sampah yang aktif.

Tes browser lulus: Cancel/Delete draft, Delete dari arsip, pulihkan ke arsip,
pulihkan draft aktif, Delete draft aktif, pemulihan; Delete/restore arsip katalog
serta review. Item katalog di Sampah tidak muncul di daftar aktif. Seluruh data
QA dikembalikan ke kondisi arsip semula; katalog sumber tidak diubah.
