# Learn-Gen 📚 - Platform Pembelajaran Video AI

Website untuk membuat video pembelajaran menggunakan AI dengan kombinasi **Grog AI** (untuk generate prompt) dan **HeyGen API** (untuk video generation).

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                         │
│              Login → Dashboard → Create Video Form             │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────────┐
│                    BACKEND (Express.js)                         │
│  Auth Routes → Video Routes → External APIs Integration        │
└────────────────┬─────────────────┬──────────────────┬───────────┘
                 │                 │                  │
    ┌────────────▼──────┐  ┌──────▼──────────┐  ┌───▼────────────┐
    │  PostgreSQL DB    │  │  Grog AI API   │  │ HeyGen API     │
    │  (Supabase)       │  │  (Prompting)   │  │ (Video Gen)    │
    └───────────────────┘  └────────────────┘  └────────────────┘
```

## 📋 7 Tahapan Alur Sistem

1. **Form Input → Backend**: User mengisi form (nama, topik, gaya, persona, durasi, aksen)
2. **Backend → Grog AI**: Generate prompt otomatis sesuai parameter
3. **Prompt → HeyGen API**: Submit prompt untuk membuat video
4. **Polling Status**: Backend polling status video hingga selesai
5. **Download Video**: Unduh file video dari HeyGen
6. **Simpan Metadata**: Simpan metadata ke database PostgreSQL
7. **Playback/Download**: Frontend menampilkan video untuk streaming/download

## 🛠️ Tech Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **API Integration**: Axios (untuk Grog AI & HeyGen)

### Frontend
- **Framework**: Next.js 16.2.11 + React 19.2.4
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **State Management**: React hooks

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm atau yarn
- PostgreSQL database (Supabase)

### 1️⃣ Clone & Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd learn-gen

# Backend setup
cd backend
npm install

# Frontend setup
cd ../frontend
npm install
```

### 2️⃣ Setup Database

#### a. Update Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL="your-supabase-url"
DIRECT_URL="your-supabase-direct-url"
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
GROQ_API_KEY=your-groq-api-key
HEYGEN_API_KEY=your-heygen-api-key
```

#### b. Run Migrations & Seed

```bash
cd backend

# Install new dependencies
npm install

# Generate Prisma client
npm run generate

# Run migrations
npm run migrate

# Seed database dengan admin test
npm run seed
```

### 3️⃣ Start Development Servers

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
# Server berjalan di http://localhost:5000
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
# Frontend berjalan di http://localhost:3000
```

### 4️⃣ Login Demo

Akses: **http://localhost:3000/auth/login**

Credentials:
- Email: `admin@learngen.com`
- Password: `password123`

## 📁 Struktur File

```
learn-gen/
├── backend/
│   ├── server.js                 # Express server main
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── seed.js              # Database seeding
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   └── videos.js            # Video endpoints (TBD)
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Home page
│   │   ├── layout.tsx           # Root layout
│   │   ├── auth/
│   │   │   ├── login/page.tsx   # Login page
│   │   │   ├── register/page.tsx # Register page
│   │   │   └── layout.tsx       # Auth layout
│   │   └── dashboard/
│   │       └── page.tsx         # Dashboard
│   ├── lib/
│   │   ├── api.ts               # API utilities
│   │   ├── auth/index.ts        # Auth utilities
│   │   └── utils.ts
│   ├── components/ui/           # Reusable UI components
│   └── package.json
```

## 🔐 Authentication Flow

```
1. User mengisi email & password di Login Page
   ↓
2. Frontend POST ke /api/auth/login
   ↓
3. Backend validasi & generate JWT token
   ↓
4. Frontend simpan token di localStorage
   ↓
5. Frontend redirect ke /dashboard
   ↓
6. Dashboard check token, tampilkan data admin
```

## 🎯 Next Steps

### Tahap 2: Video Creation Features
1. Create Video Form Page (`/dashboard/create-video`)
   - Input: nama, topik, gaya belajar, persona, durasi, aksen

2. Video Routes Backend (`routes/videos.js`)
   - POST `/api/videos` - Create video
   - GET `/api/videos` - List videos
   - GET `/api/videos/:id` - Get video detail

3. Grog AI Integration
   - Generate prompt otomatis

4. HeyGen API Integration
   - Create video dari prompt
   - Polling video status

### Tahap 3: Video Management
1. My Videos Page (`/dashboard/my-videos`)
   - List semua video
   - Status tracking
   - Download/stream video

2. Video Player Component
   - Stream video
   - Download button

## 📚 API Reference

### Authentication Endpoints

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@learngen.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login berhasil",
  "token": "jwt-token-here",
  "admin": {
    "id": 1,
    "nama": "Admin Learn-Gen",
    "email": "admin@learngen.com"
  }
}
```

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "nama": "Nama Admin",
  "email": "admin@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### Get Current Admin (Protected)
```
GET /api/auth/me
Authorization: Bearer <token>
```

## 🔑 Important Notes

1. **JWT Secret**: Ubah `JWT_SECRET` di `.env` untuk production
2. **CORS**: Backend sudah enable CORS untuk frontend
3. **Token Expiry**: JWT token expire dalam 24 jam
4. **Password Hashing**: Menggunakan bcrypt untuk keamanan

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Verify environment variables
echo $DATABASE_URL

# Test connection
npx prisma db push --skip-generate
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=5001
```

### CORS Error
- Pastikan backend berjalan di `localhost:5000`
- Pastikan frontend berjalan di `localhost:3000`

## 📞 Support

Untuk pertanyaan atau masalah, silakan buat issue di repository.

---

**Last Updated**: 2026-07-27
**Status**: 🚀 Development - Login & Auth Complete
