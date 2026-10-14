# Website Download — Peminjaman Barang PNP

Website statis untuk mengunduh **Sistem Peminjaman & Management Inventaris** (Politeknik Negeri Padang).
Data versi, tautan unduhan, changelog, dan jumlah unduhan diambil otomatis dari GitHub Releases
`muhammadsyaiful2601/peminjaman-releases`, sehingga saat ada rilis baru website langsung menyesuaikan.

## Fitur

- Tombol unduh utama untuk Windows (`.exe`) versi terbaru
- Riwayat versi lengkap dengan changelog (markdown GitHub)
- Statistik jumlah unduhan per versi
- Halaman fallback `assets/releases.json` bila GitHub API sedang tidak bisa diakses / kena rate limit
- Tanpa build step, tanpa dependency

## Struktur

```
index.html                  halaman utama
assets/styles.css           tampilan
assets/app.js               logika pengambilan data GitHub Releases
assets/logo.svg             logo (ganti dengan logo resmi bila ada)
assets/screenshot-dashboard.svg   placeholder screenshot (ganti dengan .png asli)
assets/releases.json        cache rilis, diperbarui otomatis oleh workflow
.github/workflows/pages.yml deploy otomatis ke GitHub Pages
```

## Menjalankan secara lokal

```bash
python -m http.server 8000
```

Buka http://localhost:8000

## Deploy ke GitHub Pages

1. Buat repo baru, misalnya `download-peminjaman` (privat pun bisa).
2. Upload semua file di sini ke branch `main`.
3. Repo → **Settings → Pages → Build and deployment → Source**: pilih **GitHub Actions**.
4. Workflow akan berjalan otomatis. Alamat situs: `https://<username>.github.io/<nama-repo>/`

## Ganti aset

| Yang diganti | File |
| --- | --- |
| Logo resmi | `assets/logo.svg` (atau `logo.png` + ubah `index.html`) |
| Screenshot aplikasi | taruh foto asli di `assets/shots/` (`splash.png`, `login.png`, `dashboard.png`, `form-peminjaman.png`) — lihat `assets/shots/README.md` |
| Nama instantiated / kontak | bagian `hero` dan `footer` di `index.html` |

## Catatan Teknis

- Link unduhan selalu mengarah ke URL GitHub Releases terbaru, sehingga tidak perlu mengunggah file 127 MB ke repo website.
- GitHub API untuk visitor tanpa token dibatasi 60 permintaan/jam per IP. Halaman sudah memakai cache `assets/releases.json` sebagai cadangan agar tombol unduh tetap tampil.