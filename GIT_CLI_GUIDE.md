# Panduan Git CLI untuk Multiple Accounts

## Status Konfigurasi Saat Ini ✅

Repository `wa-finance` telah berhasil dikonfigurasi untuk menggunakan akun yang berbeda:

### Repository ini (Lokal):
- **Nama**: nanmax
- **Email**: nandarifaturohman6@gmail.com

### Repository lain (Global):
- **Nama**: nandaknitto
- **Email**: nanda.knitto@gmail.com

## Git CLI Commands untuk Multiple Accounts

### 1. Mengatur Konfigurasi Lokal (Repository Spesifik)

```bash
# Set nama dan email untuk repository ini saja
git config --local user.name "nanmax"
git config --local user.email "nandarifaturohman6@gmail.com"

# Verifikasi konfigurasi lokal
git config --local user.name
git config --local user.email
```

### 2. Mengatur Konfigurasi Global (Untuk Semua Repository)

```bash
# Set nama dan email untuk semua repository (kecuali yang punya konfigurasi lokal)
git config --global user.name "nandaknitto"
git config --global user.email "nanda.knitto@gmail.com"

# Verifikasi konfigurasi global
git config --global user.name
git config --global user.email
```

### 3. Melihat Konfigurasi

```bash
# Lihat semua konfigurasi lokal (repository ini)
git config --local --list

# Lihat semua konfigurasi global
git config --global --list

# Lihat konfigurasi yang aktif (lokal > global)
git config user.name
git config user.email

# Lihat dari mana konfigurasi diambil
git config --show-origin user.name
git config --show-origin user.email
```

### 4. Reset Konfigurasi

```bash
# Hapus konfigurasi lokal, akan menggunakan global
git config --local --unset user.name
git config --local --unset user.email

# Hapus konfigurasi global
git config --global --unset user.name
git config --global --unset user.email
```

### 5. Workflow untuk Repository ini

```bash
# 1. Verifikasi akun yang akan digunakan
git config user.name
git config user.email

# 2. Lakukan perubahan
git add .
git commit -m "Update dengan akun nanmax"

# 3. Push ke repository
git push origin main
```

### 6. Workflow untuk Repository Lain

```bash
# Pindah ke repository lain
cd /path/to/other/repo

# Verifikasi menggunakan akun global
git config user.name  # Akan menampilkan nandaknitto
git config user.email # Akan menampilkan nanda.knitto@gmail.com

# Lakukan commit
git add .
git commit -m "Update dengan akun nandaknitto"
git push origin main
```

### 7. Verifikasi Commit Author

```bash
# Lihat author commit terakhir
git log --oneline -1
git show --format=fuller -s

# Lihat semua commit dengan detail author
git log --pretty=format:"%h - %an, %ar : %s"
```

### 8. Perintah Cepat untuk Switch

```bash
# Quick switch ke akun nanmax untuk repository ini
git config --local user.name "nanmax" && git config --local user.email "nandarifaturohman6@gmail.com"

# Quick switch ke akun nandaknitto untuk repository ini
git config --local user.name "nandaknitto" && git config --local user.email "nanda.knitto@gmail.com"

# Reset ke global untuk repository ini
git config --local --unset user.name && git config --local --unset user.email
```

### 9. Troubleshooting

#### Jika commit masih menggunakan akun yang salah:
```bash
# Cek konfigurasi yang aktif
git config user.name
git config user.email

# Jika masih salah, set ulang
git config --local user.name "nanmax"
git config --local user.email "nandarifaturohman6@gmail.com"
```

#### Jika ingin melihat semua konfigurasi:
```bash
# Lihat semua konfigurasi (system, global, local)
git config --list --show-origin
```

#### Jika ingin backup konfigurasi:
```bash
# Backup konfigurasi lokal
git config --local --list > git-config-backup.txt

# Restore konfigurasi lokal
# Edit file git-config-backup.txt dan jalankan perintah yang ada di dalamnya
```

### 10. Tips dan Best Practices

1. **Selalu Verifikasi Sebelum Commit**:
   ```bash
   git config user.name
   git config user.email
   ```

2. **Gunakan Alias untuk Perintah Cepat**:
   ```bash
   # Tambahkan ke ~/.gitconfig
   [alias]
       whoami = "!echo 'Name: ' && git config user.name && echo 'Email: ' && git config user.email"
       switch-nanmax = "!git config --local user.name nanmax && git config --local user.email nandarifaturohman6@gmail.com"
       switch-nandaknitto = "!git config --local user.name nandaknitto && git config --local user.email nanda.knitto@gmail.com"
   ```

3. **Gunakan Script untuk Otomatisasi**:
   ```bash
   # Buat file switch-account.sh
   #!/bin/bash
   case $1 in
       "nanmax")
           git config --local user.name "nanmax"
           git config --local user.email "nandarifaturohman6@gmail.com"
           echo "Switched to nanmax"
           ;;
       "nandaknitto")
           git config --local user.name "nandaknitto"
           git config --local user.email "nanda.knitto@gmail.com"
           echo "Switched to nandaknitto"
           ;;
       *)
           echo "Usage: ./switch-account.sh [nanmax|nandaknitto]"
           ;;
   esac
   ```

### 11. Contoh Penggunaan Lengkap

```bash
# 1. Masuk ke repository wa-finance
cd wa-finance

# 2. Verifikasi akun yang aktif
git config user.name
git config user.email

# 3. Lakukan perubahan
echo "Test file" > test.txt

# 4. Commit dengan akun nanmax
git add test.txt
git commit -m "Add test file dengan akun nanmax"

# 5. Push ke repository
git push origin main

# 6. Verifikasi commit
git log --oneline -1
git show --format=fuller -s
```

Dengan konfigurasi ini, repository `wa-finance` akan selalu menggunakan akun `nanmax`, sementara repository lain akan menggunakan akun `nandaknitto`! 