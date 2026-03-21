# Sentinel — Smart Transportation & Public Safety System

Sentinel is an enterprise-grade **Smart Transportation & Public Safety** platform for managing cameras, incidents, and alerts with role-based access control (RBAC).

---

## Project Summary

| Layer      | Stack            | Purpose                                                 |
|-----------|------------------|---------------------------------------------------------|
| **Backend**  | FastAPI + MongoDB | REST API, JWT auth, RBAC, incident/camera/alert APIs     |
| **Frontend** | React + Vite + Tailwind | Dark-themed dashboard, login, protected routes        |
| **Database** | MongoDB (Motor)   | Users, incidents, cameras, alerts                       |
| **Auth**     | JWT + bcrypt      | Token-based auth, role validation (admin, police, authority) |

### Core Features

- **Authentication** — Login via email/password, JWT tokens, persistent sessions
- **RBAC** — Roles: `admin`, `police`, `authority` with different permissions
- **Incidents** — Report, list, and update status (accident, fire, crime)
- **Cameras** — CRUD for CCTV, IP, Drone, Mobile cameras
- **Alerts** — Auto-generated from incidents, sortable by priority, acknowledge workflow
- **Health** — API and database health checks
- **Seeding** — One-time admin user creation on startup

---

## Project Structure

```
sentinel_new/
├── backend/
│   ├── app/
│   │   ├── api/           # API routers (auth, cameras, alerts, health)
│   │   ├── core/          # config, security, deps, seed
│   │   ├── db/            # MongoDB connection
│   │   ├── models/        # Pydantic models (user, incident, camera, alert)
│   │   ├── routes/        # incidents, protected test routes
│   │   ├── schemas/       # API request/response schemas
│   │   └── services/      # Business logic (auth, incident, camera, alert)
│   ├── scripts/
│   │   └── seed_admin.py  # Manual admin password reset (--force)
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client (base URL, Auth header)
│   │   ├── components/    # Navbar, Sidebar, AlertPanel, ProtectedRoute
│   │   ├── context/       # AuthContext (login, logout, user)
│   │   ├── layouts/       # DashboardLayout
│   │   ├── pages/         # Login, Dashboard
│   │   └── styles/        # Tailwind global styles
│   └── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or remote)

### Backend

1. Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=sentinel_new
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ADMIN_EMAIL=admin@sentinel.com
ADMIN_PASSWORD=admin123
```

2. Install and run:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. **Reset admin password** (if login fails):

```bash
cd backend
python scripts/seed_admin.py --force
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` and log in with **admin@sentinel.com** / **admin123**.

---

## API Overview

| Method | Endpoint                    | Auth | Role         | Description                    |
|--------|-----------------------------|------|--------------|--------------------------------|
| GET    | `/`                         | No   | —            | Root status                    |
| GET    | `/health`                   | No   | —            | API + DB health                |
| GET    | `/health/db`                | No   | —            | DB ping only                   |
| POST   | `/auth/login`               | No   | —            | Login (email, password)        |
| GET    | `/auth/me`                  | JWT  | Any          | Current user                   |
| POST   | `/incidents/report`         | JWT  | Any          | Report incident                |
| GET    | `/incidents/all`            | JWT  | admin, police| List incidents                 |
| PATCH  | `/incidents/{id}/status`    | JWT  | admin        | Update incident status         |
| POST   | `/cameras`                  | JWT  | admin        | Add camera                     |
| GET    | `/cameras`                  | JWT  | admin, police| List cameras                   |
| PATCH  | `/cameras/{id}/status`      | JWT  | admin        | Update camera status           |
| GET    | `/alerts`                   | JWT  | admin, police| List alerts (by priority)      |
| PATCH  | `/alerts/{id}/acknowledge`  | JWT  | admin, police| Acknowledge alert              |
| GET    | `/protected/admin`          | JWT  | admin        | Test route                     |
| GET    | `/protected/police`         | JWT  | police       | Test route                     |

---

## Tech Stack

**Backend**

- FastAPI, Uvicorn
- Motor (async MongoDB)
- JWT (python-jose), bcrypt
- Pydantic, python-dotenv

**Frontend**

- React 19, Vite 7
- React Router, Axios
- Tailwind CSS v4 (dark theme)

---

## License

Private / Proprietary
Follow for more intresting projects hi
