# 🏢 RTRW Billing System

Sistem billing dan manajemen pelanggan RTRW (Rukun Tetangga Rukun Warga) dengan integrasi MikroTik RouterOS untuk manajemen PPP Secret dan monitoring koneksi internet.

## 🚀 Fitur Utama

- **Manajemen Pelanggan**: CRUD pelanggan dengan data lengkap
- **Manajemen Paket**: Konfigurasi paket internet dengan harga
- **Billing System**: Sistem tagihan otomatis dengan status pembayaran
- **Integrasi MikroTik**: Auto enable/disable PPP Secret berdasarkan status pembayaran
- **Manajemen Area & ODP**: Organisasi pelanggan berdasarkan area dan ODP
- **Dashboard Analytics**: Monitoring pendapatan dan status pelanggan
- **Receipt Generator**: Generate kwitansi pembayaran otomatis
- **Auto Suspend**: Suspend otomatis pelanggan yang menunggak

## 🛠️ Tech Stack

### Frontend
- **React 18** dengan TypeScript
- **Vite** untuk build tool
- **Tailwind CSS** untuk styling
- **shadcn/ui** untuk komponen UI
- **React Query** untuk state management
- **React Router** untuk routing

### Backend
- **Node.js** dengan Express.js
- **TypeScript** untuk type safety
- **Sequelize ORM** untuk database
- **MySQL/MariaDB** untuk database
- **node-routeros** untuk integrasi MikroTik
- **node-cron** untuk scheduled tasks

## 📋 Persyaratan Sistem

- **Node.js** 18+
- **MySQL/MariaDB** 8.0+
- **Nginx** (untuk production)
- **PM2** (untuk process management)
- **MikroTik RouterOS** dengan API enabled

## 🚀 Quick Start (Development)

```bash
# Clone repository
git clone https://github.com/dzawin98/ltsbillaapanel.git
cd ltsbillaapanel

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Setup database
mysql -u root -p < ../database-setup.sql
npx sequelize-cli db:migrate

# Start backend (terminal 1)
npm run dev

# Start frontend (terminal 2)
cd ..
npm run dev
```

## 🌐 Production Deployment

### aaPanel Deployment
Untuk deployment di aaPanel, ikuti panduan lengkap di [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### Docker Deployment
```bash
# Build dan jalankan dengan Docker Compose
docker-compose up -d

# Atau build manual
docker build -t rtrw-billing .
docker run -d -p 80:80 -p 3001:3001 rtrw-billing
```

## 📁 Struktur Project

```
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── backend/               # Backend Node.js app
│   ├── src/               # Source code
│   ├── models/            # Sequelize models
│   ├── migrations/        # Database migrations
│   ├── routes/            # API routes
│   └── utils/             # Backend utilities
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🔧 Konfigurasi

### Environment Variables
Buat file `.env.production` untuk production:

```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_NAME=rtrw_db_production
DB_USER=root
DB_PASSWORD=your_password
MIKROTIK_HOST=192.168.1.1
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_mikrotik_password
```

### Database Configuration
Update `backend/config/config.json` dengan kredensial database Anda.

## 📊 Monitoring & Maintenance

```bash
# Cek status aplikasi
./monitor.sh

# Backup database dan aplikasi
./backup.sh

# Deploy aplikasi
./deploy.sh
```

## 🔒 Security Features

- Input validation dan sanitization
- SQL injection protection dengan Sequelize ORM
- CORS configuration
- Rate limiting untuk API
- Secure headers dengan Nginx

## 📱 Mobile Responsive

Aplikasi fully responsive dan dapat diakses melalui mobile browser dengan UX yang optimal.

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Untuk support dan pertanyaan:
- Email: support@example.com
- GitHub Issues: [Create Issue](https://github.com/dzawin98/ltsbillaapanel/issues)

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) untuk komponen UI
- [Tailwind CSS](https://tailwindcss.com/) untuk styling
- [MikroTik](https://mikrotik.com/) untuk RouterOS API
- [Sequelize](https://sequelize.org/) untuk ORM
