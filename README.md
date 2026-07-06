# SafeCampus AI 🛡️

## Emergency SOS & Campus Safety Grid

A production-ready, real-time emergency response platform for campus safety with AI-powered assistance, live GPS tracking, multi-role dashboards, real-time communication, and smart responder assignment.

![Node.js](https://img.shields.io/badge/Node.js-v20-green?logo=node.js)
![React](https://img.shields.io/badge/React-v19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-blue?logo=postgresql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-black?logo=socket.io)

---

## 🚀 Features

### Student Dashboard
- **One-Tap SOS** with long-press confirmation
- Emergency categories: Medical, Fire, Harassment, Ragging, Accident, Theft, Violence
- Live GPS location streaming
- Real-time chat with security
- Audio & Video calls (WebRTC)
- Emergency contacts management
- Medical profile storage
- Incident history & timeline
- Smart notifications

### Security Dashboard
- Incoming SOS alerts (real-time)
- Incident accept/reject workflow
- Status updates: On the way → Reached → Resolved
- Navigate to student location
- Live chat & calls
- Evidence upload

### Admin Dashboard
- Analytics dashboard with charts
- Incident trends (30-day)
- Category & severity breakdown
- Guard performance metrics
- User management (CRUD)
- Activity logs
- Campus heatmap data

### AI Features
- **Threat Severity Prediction** — Multi-factor scoring
- **Fake SOS Detection** — Pattern analysis
- **Smart Responder Assignment** — Distance + rating + experience
- **Incident Summarization** — Auto-generated reports
- **Emergency Guidance** — Category-specific safety tips

### Real-Time Communication
- Socket.IO for instant messaging
- Typing indicators & read receipts
- WebRTC audio/video calls
- Live GPS location streaming

---

## 🏗️ Architecture

```
Frontend (React + Vite + TypeScript)
  ├── Ant Design UI
  ├── Framer Motion animations
  ├── Socket.IO Client
  ├── Leaflet Maps
  └── Recharts analytics

Backend (Node.js + Express + TypeScript)
  ├── REST API
  ├── Socket.IO Server
  ├── WebRTC Signaling
  ├── AI Module
  └── Notification Service

Database (PostgreSQL + Prisma)
  └── 20+ tables with relations
```

---

## 📦 Installation

### Prerequisites
- Node.js v18+
- PostgreSQL v14+ (or Docker)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd LBRCE-HACK
```

### 2. Start PostgreSQL
```bash
# Using Docker
docker-compose up -d

# Or use your local PostgreSQL
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your database URL

npm install
npx prisma generate
npx prisma db push
npm run prisma:seed   # Seed demo data
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | student@safecampus.com | Student@123 |
| Security | security@safecampus.com | Security@123 |
| Admin | admin@safecampus.com | Admin@123 |

---

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/safecampus
JWT_SECRET=your-jwt-secret
PORT=5000
FRONTEND_URL=http://localhost:5173
GOOGLE_MAPS_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
FIREBASE_PROJECT_ID=your_project
CLOUDINARY_CLOUD_NAME=your_cloud
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register student |
| POST | /api/auth/login | Login (any role) |
| GET | /api/auth/me | Get current user |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/incidents/sos | Trigger SOS |
| GET | /api/incidents | List incidents |
| GET | /api/incidents/:id | Get incident detail |
| PUT | /api/incidents/:id/status | Update status |
| POST | /api/incidents/:id/accept | Accept incident |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users (Admin) |
| GET | /api/users/profile | Get profile |
| PUT | /api/users/profile | Update profile |
| PUT | /api/users/medical-profile | Update medical info |
| CRUD | /api/users/emergency-contacts | Manage contacts |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Dashboard stats |
| GET | /api/analytics/trends | Incident trends |
| GET | /api/analytics/heatmap | Heatmap data |
| GET | /api/analytics/guard-performance | Guard metrics |

---

## 🔐 Security

- JWT Authentication with role-based access
- bcrypt password hashing (12 rounds)
- Helmet HTTP security headers
- CORS configuration
- Rate limiting (100 req/15min)
- Input validation
- SQL injection protection (Prisma ORM)
- XSS protection

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend → Render
```bash
cd backend
npm run build
# Deploy to Render with start command: node dist/server.js
```

### Database → Neon PostgreSQL
Create a Neon database and update `DATABASE_URL` in backend `.env`.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Ant Design, Framer Motion |
| Backend | Node.js, Express 5, TypeScript, Socket.IO |
| Database | PostgreSQL, Prisma ORM |
| Real-time | Socket.IO, WebRTC |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |
| Auth | JWT, bcrypt |
| AI | Custom rule-based algorithms |

---

## 📄 License

MIT License

---

## 👥 Team

Built with ❤️ for campus safety.

SafeCampus AI — *Your Safety, Our Priority*
