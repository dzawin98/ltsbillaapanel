# Tutorial Lengkap Deployment RTRW Billing System di aaPanel

## Persiapan Sistem

### 1. Persyaratan Minimum
- aaPanel versi terbaru
- Node.js 18+ (install melalui aaPanel App Store)
- MySQL 5.7+ atau MariaDB 10.3+
- Nginx (sudah terinstall di aaPanel)
- PM2 (akan diinstall otomatis)
- Git (untuk clone repository)

### 2. Persiapan aaPanel

#### Install Node.js
1. Login ke aaPanel
2. Buka **App Store** → **Runtime Environment**
3. Install **Node.js** versi 18 atau lebih tinggi
4. Install **PM2** dari App Store

#### Setup Database
1. Buka **Database** → **MySQL**
2. Buat database baru: `rtrw_db_production`
3. Buat user database dengan akses penuh ke database tersebut
4. Catat username, password, dan host database

## Deployment Aplikasi

### 1. Clone Repository

```bash
# Masuk ke direktori web
cd /www/wwwroot/

# Clone repository
git clone https://github.com/dzawin98/ltsbillaapanel.git

# Masuk ke direktori project
cd ltsbillaapanel

# Berikan permission yang tepat
chown -R www:www /www/wwwroot/ltsbillaapanel
chmod -R 755 /www/wwwroot/ltsbillaapanel
```

### 2. Setup Otomatis

```bash
# Jalankan script setup otomatis
bash setup.sh
```

Script ini akan:
- Mengecek dependensi yang diperlukan
- Install dependencies frontend dan backend
- Membuat direktori log
- Setup file environment
- Build aplikasi

### 3. Konfigurasi Environment

Edit file `.env.production` di direktori `backend/`:

```bash
nano backend/.env.production
```

Sesuaikan konfigurasi berikut:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rtrw_db_production
DB_USER=your_db_user
DB_PASS=your_db_password

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://your-local-ip

# MikroTik Configuration
MIKROTIK_HOST=your_mikrotik_ip
MIKROTIK_USERNAME=your_mikrotik_user
MIKROTIK_PASSWORD=your_mikrotik_password

# Timezone
TZ=Asia/Jakarta
```

### 4. Setup Database

```bash
# Masuk ke direktori backend
cd backend

# Jalankan migrasi database
npx sequelize-cli db:migrate

# (Opsional) Jalankan seeder untuk data awal
npx sequelize-cli db:seed:all
```

### 5. Build dan Deploy

```bash
# Kembali ke root directory
cd ..

# Jalankan script deploy
bash deploy.sh
```

## Konfigurasi Nginx

### 1. Buat Website di aaPanel

1. Buka **Website** → **Add Site**
2. Domain: `your-local-ip` atau domain lokal
3. Root Directory: `/www/wwwroot/ltsbillaapanel/dist`
4. PHP Version: Tidak perlu (aplikasi Node.js)

### 2. Konfigurasi Nginx

1. Klik **Settings** pada website yang baru dibuat
2. Pilih tab **Config File**
3. Replace konfigurasi dengan file `nginx.conf` yang sudah disediakan:

```bash
cp nginx.conf /www/server/panel/vhost/nginx/your-domain.conf
```

Atau copy manual isi file `nginx.conf` ke konfigurasi Nginx.

### 3. Restart Nginx

```bash
# Restart Nginx melalui aaPanel atau command line
systemctl restart nginx
```

## Menjalankan Aplikasi

### 1. Start dengan PM2

```bash
# Start aplikasi
npm run start:prod

# Cek status
npm run status

# Lihat logs
npm run logs
```

### 2. Verifikasi Deployment

```bash
# Cek health endpoint
curl http://localhost:3001/api/health

# Cek frontend
curl http://your-local-ip
```

## Konfigurasi Port Forwarding Mikrotik

### 1. Setup NAT Rule

Login ke Mikrotik dan buat NAT rule:

```
/ip firewall nat
add action=dst-nat chain=dstnat dst-port=80 protocol=tcp to-addresses=your-local-ip to-ports=80
add action=dst-nat chain=dstnat dst-port=3001 protocol=tcp to-addresses=your-local-ip to-ports=3001
```

### 2. Firewall Rules

```
/ip firewall filter
add action=accept chain=forward dst-port=80 protocol=tcp
add action=accept chain=forward dst-port=3001 protocol=tcp
```

## Monitoring dan Maintenance

### 1. Monitoring Otomatis

```bash
# Jalankan script monitoring
bash monitor.sh

# Setup cron job untuk monitoring berkala
crontab -e

# Tambahkan line berikut untuk monitoring setiap 5 menit
*/5 * * * * /www/wwwroot/ltsbillaapanel/monitor.sh >> /www/wwwroot/ltsbillaapanel/logs/monitor.log 2>&1
```

### 2. Backup Otomatis

```bash
# Setup backup harian
crontab -e

# Tambahkan line berikut untuk backup setiap hari jam 2 pagi
0 2 * * * /www/wwwroot/ltsbillaapanel/backup.sh
```

### 3. Log Management

```bash
# Lihat logs aplikasi
tail -f logs/app.log

# Lihat logs error
tail -f logs/error.log

# Lihat logs PM2
npm run logs
```

## Troubleshooting

### 1. Aplikasi Tidak Bisa Diakses

```bash
# Cek status PM2
npm run status

# Restart aplikasi
npm run restart:prod

# Cek logs error
tail -f logs/error.log
```

### 2. Database Connection Error

```bash
# Test koneksi database
mysql -h localhost -u your_db_user -p rtrw_db_production

# Cek konfigurasi .env.production
cat backend/.env.production
```

### 3. Nginx Error

```bash
# Cek konfigurasi Nginx
nginx -t

# Restart Nginx
systemctl restart nginx

# Cek logs Nginx
tail -f /www/wwwlogs/your-domain.log
```

### 4. Port Forwarding Issues

```bash
# Cek apakah port terbuka
netstat -tulpn | grep :80
netstat -tulpn | grep :3001

# Test dari luar jaringan
telnet your-public-ip 80
```

## Perintah Berguna

### PM2 Commands
```bash
npm run start:prod    # Start aplikasi
npm run stop:prod     # Stop aplikasi
npm run restart:prod  # Restart aplikasi
npm run status        # Cek status
npm run logs          # Lihat logs
```

### Maintenance Commands
```bash
npm run monitor       # Jalankan monitoring
npm run backup        # Backup manual
npm run deploy        # Deploy ulang
```

### Database Commands
```bash
# Backup database
mysqldump -u your_db_user -p rtrw_db_production > backup.sql

# Restore database
mysql -u your_db_user -p rtrw_db_production < backup.sql

# Reset database (hati-hati!)
npx sequelize-cli db:migrate:undo:all
npx sequelize-cli db:migrate
```

## Keamanan

### 1. Firewall aaPanel

1. Buka **Security** → **Firewall**
2. Buka port 80 dan 3001 hanya untuk IP yang diperlukan
3. Tutup port yang tidak digunakan

### 2. SSL Certificate (Opsional)

Jika menggunakan domain:

1. Buka **Website** → **SSL**
2. Apply SSL certificate (Let's Encrypt atau manual)
3. Update konfigurasi Nginx untuk HTTPS

### 3. Database Security

```bash
# Ganti password database secara berkala
# Batasi akses database hanya dari localhost
# Backup database secara rutin
```

## Update Aplikasi

```bash
# Pull update terbaru
git pull origin master

# Install dependencies baru (jika ada)
npm install
cd backend && npm install && cd ..

# Build ulang
npm run build
cd backend && npm run build && cd ..

# Restart aplikasi
npm run restart:prod
```

## Support

Jika mengalami masalah:

1. Cek logs aplikasi di `logs/`
2. Jalankan `monitor.sh` untuk diagnostic
3. Cek dokumentasi di `README.md`
4. Hubungi support: dzawin98@gmail.com

---

**Catatan Penting:**
- Selalu backup sebelum melakukan perubahan
- Monitor logs secara berkala
- Update sistem dan dependencies secara rutin
- Test semua fitur setelah deployment
- Dokumentasikan setiap perubahan konfigurasi