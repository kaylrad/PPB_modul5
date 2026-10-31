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

Saat API gagal, katalog contoh dan favorit lokal tersedia. Draft dan profil disimpan
di browser. Upload menggunakan data URL jika bucket tidak dapat diakses, sesuai
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

## Pengembangan fitur umum

Tema dan API katalog tetap memakai konfigurasi semula. Halaman memakai React.lazy
dan Suspense; query katalog memakai TanStack Query (staleTime 60 detik, cache
5 menit), termasuk invalidation setelah request mutasi berhasil.

Profile memiliki navigasi About/Contact, daftar draft, login akun, dan halaman
Edit Profile terpisah. Link informasi dapat dibagikan melalui #about dan #contact.
Draft lokal dipisahkan menurut akun login; draft lama tanpa akun hanya tersedia
pada sesi perangkat semula, tidak otomatis diklaim oleh akun baru.

Nama dan bio akun disimpan ke tabel merch_profiles di proyek Supabase milik
pengguna yang sudah dibuat, dengan RLS id=auth.uid(). API katalog praktikum tetap
terpisah karena akun pengguna tidak mempunyai akses administrasi ke server modul.

Konfigurasi tambahan (lokal .env dan Vercel Production/Preview):

- VITE_ACCOUNT_API_URL: URL Supabase akun milik pengguna.
- VITE_ACCOUNT_PUBLISHABLE_KEY: publishable key proyek akun.
- Jangan memasukkan secret key atau database password ke frontend.

Migration akun: supabase/migrations/20261031_account_profiles.sql. Tabel ini telah
dibuat pada database akun saat persiapan sebelumnya; migration aman untuk proyek
akun baru dan tidak mengubah tabel katalog.

Pemeriksaan: npm test, npm run lint, npm run build. Pemeriksaan profil otomatis
menggunakan request mock; login, konfirmasi email, dan penyimpanan profil melalui
akun pengguna perlu diverifikasi terpisah. Tidak ada TypeScript/typecheck pada
konfigurasi proyek ini.

Pengembangan ini tidak menambahkan share tautan produk, arsip katalog, CRUD/vote
review tambahan, keranjang, atau checkout pemesanan senjata api.
