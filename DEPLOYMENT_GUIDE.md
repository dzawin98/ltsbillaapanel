# 🚀 Panduan Deployment RTRW Billing System di aaPanel

## 📋 Daftar Isi
1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Persiapan aaPanel](#persiapan-aapanel)
3. [Clone Repository](#clone-repository)
4. [Konfigurasi Database](#konfigurasi-database)
5. [Setup Backend](#setup-backend)
6. [Setup Frontend](#setup-frontend)
7. [Konfigurasi Nginx](#konfigurasi-nginx)
8. [Menjalankan Aplikasi](#menjalankan-aplikasi)
9. [Monitoring dan Maintenance](#monitoring-dan-maintenance)
10. [Troubleshooting](#troubleshooting)

## 🔧 Persyaratan Sistem

### Software yang Diperlukan:
- **aaPanel** versi terbaru
- **Node.js** 18+ (install via aaPanel)
- **MySQL/MariaDB** (install via aaPanel)
- **Nginx** (install via aaPanel)
- **PM2** (untuk process management)
- **Git** (untuk clone repository)

### Spesifikasi Server Minimum:
- RAM: 2GB
- Storage: 10GB
- CPU: 1 Core
- OS: Linux (Ubuntu/CentOS)

## 🛠️ Persiapan aaPanel

### 1. Install Software Stack
Masuk ke aaPanel dashboard dan install:

```bash
# Install melalui aaPanel Software Store:
- Nginx 1.20+
- MySQL 8.0+ atau MariaDB 10.6+
- Node.js 18+
- PM2 Manager
```

### 2. Buat Website Baru
1. Buka **Website** → **Add Site**
2. Domain: `your-domain.com` atau gunakan IP server
3. Root Directory: `/www/wwwroot/ltsbillaapanel`
4. PHP Version: Tidak perlu (aplikasi Node.js)

## 📥 Clone Repository

### 1. Akses Terminal aaPanel
```bash
# Masuk ke direktori web
cd /www/wwwroot/

# Clone repository
git clone https://github.com/dzawin98/ltsbillaapanel.git

# Masuk ke direktori aplikasi
cd ltsbillaapanel

# Set permission
chown -R www:www /www/wwwroot/ltsbillaapanel
chmod -R 755 /www/wwwroot/ltsbillaapanel
```

## 🗄️ Konfigurasi Database

### 1. Buat Database via aaPanel
1. Buka **Database** → **Add Database**
2. Database Name: `rtrw_db_production`
3. Username: `root` (atau buat user baru)
4. Password: (set password yang kuat)

### 2. Import Database Schema
```bash
# Via terminal aaPanel
mysql -u root -p rtrw_db_production < /www/wwwroot/ltsbillaapanel/database-setup.sql
```

### 3. Update Konfigurasi Database
Edit file `backend/config/config.json`:
```json
{
  "production": {
    "username": "root",
    "password": "your_mysql_password",
    "database": "rtrw_db_production",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}
```

## ⚙️ Setup Backend

### 1. Install Dependencies
```bash
cd /www/wwwroot/ltsbillaapanel/backend
npm install
```

### 2. Konfigurasi Environment
Edit file `backend/.env.production`:
```env
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=rtrw_db_production
DB_USER=root
DB_PASSWORD=your_mysql_password

# CORS (sesuaikan dengan domain Anda)
CORS_ORIGIN=http://your-domain.com

# MikroTik (sesuaikan dengan router Anda)
MIKROTIK_HOST=192.168.1.1
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_mikrotik_password

TZ=Asia/Jakarta
```

### 3. Build Backend
```bash
npm run build
```

### 4. Jalankan Migrasi Database
```bash
npx sequelize-cli db:migrate --env production
```

## 🎨 Setup Frontend

### 1. Install Dependencies
```bash
cd /www/wwwroot/ltsbillaapanel
npm install
```

### 2. Update Konfigurasi API
Edit file `src/utils/api.ts` dan pastikan base URL mengarah ke backend:
```typescript
const API_BASE_URL = '/api'; // Menggunakan relative path untuk proxy
```

### 3. Build Frontend
```bash
npm run build
```

## 🌐 Konfigurasi Nginx

### 1. Update Konfigurasi Site
Buka **Website** → **Manage** → **Config** dan ganti dengan:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /www/wwwroot/ltsbillaapanel/dist;
    index index.html;
    
    # Frontend - Serve static files
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API - Reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 2. Reload Nginx
```bash
nginx -t  # Test konfigurasi
nginx -s reload  # Reload jika test berhasil
```

## 🚀 Menjalankan Aplikasi

### 1. Setup PM2 via aaPanel
1. Buka **App Store** → **PM2 Manager** → **Install**
2. Atau install manual via terminal:
```bash
npm install -g pm2
```

### 2. Start Aplikasi
```bash
cd /www/wwwroot/ltsbillaapanel

# Start dengan PM2
pm2 start ecosystem.config.js --env production

# Save konfigurasi PM2
pm2 save
pm2 startup
```

### 3. Verifikasi Status
```bash
pm2 status
pm2 logs rtrw-backend
```

## 📊 Monitoring dan Maintenance

### Commands Berguna:
```bash
# Cek status aplikasi
pm2 status

# Lihat logs
pm2 logs rtrw-backend
pm2 logs rtrw-backend --lines 100

# Restart aplikasi
pm2 restart rtrw-backend

# Stop aplikasi
pm2 stop rtrw-backend

# Reload aplikasi (zero downtime)
pm2 reload rtrw-backend

# Monitor real-time
pm2 monit
```

### Setup Log Rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 🔧 Troubleshooting

### 1. Backend Tidak Bisa Start
```bash
# Cek logs error
pm2 logs rtrw-backend --err

# Cek port yang digunakan
netstat -tulpn | grep 3001

# Test koneksi database
mysql -u root -p -e "USE rtrw_db_production; SHOW TABLES;"
```

### 2. Frontend Tidak Load
```bash
# Cek file build
ls -la /www/wwwroot/ltsbillaapanel/dist/

# Cek permission
chown -R www:www /www/wwwroot/ltsbillaapanel/dist/

# Test nginx config
nginx -t
```

### 3. Database Connection Error
- Pastikan MySQL service running
- Cek kredensial di `backend/config/config.json`
- Cek firewall settings

### 4. MikroTik Connection Error
- Pastikan IP MikroTik bisa diakses dari server
- Cek kredensial MikroTik di `.env.production`
- Test koneksi manual ke MikroTik

## 🔒 Security Recommendations

1. **Firewall**: Buka hanya port yang diperlukan (80, 443, 22)
2. **SSL**: Install SSL certificate via aaPanel
3. **Database**: Gunakan user database khusus, bukan root
4. **Backup**: Setup automated backup untuk database
5. **Updates**: Update sistem dan dependencies secara berkala

## 📞 Support

Jika mengalami masalah:
1. Cek logs aplikasi: `pm2 logs rtrw-backend`
2. Cek logs Nginx: `/www/wwwlogs/your-domain.com.error.log`
3. Cek logs MySQL: `/www/server/mysql/mysql-error.log`

---

**Selamat! Aplikasi RTRW Billing System sudah siap digunakan! 🎉**

Akses aplikasi di: `http://your-server-ip` atau `http://your-domain.com`