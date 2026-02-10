# Sentinel - Smart Transportation & Public Safety System

Sentinel is an AI-assisted incident management platform for smart city/public safety use-cases. It combines live camera ingestion, YOLO-based detection, incident/alert workflows, and role-aware operational dashboards.

---

## Current Project Snapshot

| Layer | Current Stack | Why It Exists |
|---|---|---|
| Backend | FastAPI, Uvicorn, Motor | Async APIs for incidents/cameras/alerts/dispatch and AI inference orchestration |
| Frontend | React 19, Vite 7, Tailwind v4, Recharts, Leaflet | Real-time dashboard UX, camera views, incident response workflows, analytics |
| Auth | Clerk-first + legacy JWT fallback | Modern auth UX with backward-compatible API token flow |
| ML Inference | Ultralytics YOLOv8 + OpenCV + Torch | Real-time frame/video detection for violence and road accidents |
| Database | MongoDB | Persistent storage for incidents, cameras, alerts, dispatch entries |

---

## What Is Working Right Now

- Real-time detection from local webcam and IP camera streams.
- Video upload detection endpoint (`/incidents/detect-from-video`) with auto incident generation.
- Frame-level detection endpoint (`/incidents/detect-frame`) for live polling.
- Incident creation directly from live detections (`/incidents/create-from-detection`).
- Alert acknowledgment workflow (`/alerts/{alert_id}/acknowledge`).
- Dispatch creation and retrieval (`/dispatch`).
- Directory listing endpoint (`/directory`) for operational contacts view.
- Analytics page with incident trends and severity charts.
- Camera stream proxy endpoint (`/cameras/stream-proxy`) to avoid client-side CORS issues.

---

## How The Current System Works

### 1. Camera and Feed Handling

- Frontend lets operators use local webcam or configured IP camera streams.
- IP streams are passed through backend proxy endpoints to handle browser restrictions safely.

### 2. Real-Time Detection Loop

- Frontend captures frames periodically:
	- Local webcam: every ~500ms
	- IP camera: every ~1s
- Each frame is sent to `/incidents/detect-frame` as base64 image data.
- Backend decodes image, runs YOLO inference, and returns bounding boxes + labels.

### 3. Incident and Alert Generation

- If violence/accident is detected, frontend enforces a 15-second cooldown.
- Frontend calls `/incidents/create-from-detection`.
- Backend maps detection type -> incident type/severity and creates incident records.
- Detection-based incident creation also creates alerts for operator action.

### 4. Uploaded Video Analysis

- Video is uploaded to `/incidents/detect-from-video`.
- Backend samples frames (`frame_stride=5`) and runs YOLO over the video.
- Detected events are converted to incidents/alerts and tied to camera coordinates when available.

### 5. Operations and Response

- Dashboard shows active alerts and camera state.
- Incidents and Alerts pages support triage and acknowledgment.
- Dispatch workflow supports assigning unit/service response.
- Analytics summarizes historical severity and trend patterns.

---

## Detection Model and Version (Current)

### Model in Use

- Runtime detector is loaded from:
	- `backend/model/runs/detect/train_combined/weights/best.pt`
- Inference engine code:
	- `backend/app/core/yolo_inference.py`

### Model Type

- Architecture family: **Ultralytics YOLOv8 (detect)**
- Training base model: **`yolov8n.pt`** (nano) for combined training
- Runtime classes used by backend logic:
	- `0 = NonViolence`
	- `1 = Violence`
	- `2 = Accident`

### Version Notes

- Backend dependency currently specifies:
	- `ultralytics>=8.0.0`
- This means YOLOv8 is required, but exact patch version depends on the installed environment at runtime.

---

## Why This Tech Stack

### FastAPI (Backend)

- Async-friendly, great for IO-heavy workloads (DB + video/frame APIs).
- Strong request/response modeling and fast iteration for ML-integrated APIs.
- Easy background offloading for heavier inference tasks.

### MongoDB + Motor

- Flexible schema for evolving incident/alert payloads.
- Works well with high-write operational events and geospatial-friendly camera metadata.
- Motor enables non-blocking DB access in async endpoints.

### React + Vite + Tailwind

- React is ideal for stateful dashboards and real-time UI updates.
- Vite gives fast local development and lean builds.
- Tailwind speeds consistent component styling in an operations UI.

### Clerk + JWT fallback

- Clerk simplifies secure auth flows and frontend session handling.
- Existing JWT endpoints keep backward compatibility with older clients and scripts.

### YOLOv8 + OpenCV + Torch

- YOLOv8 provides strong real-time detection speed/accuracy tradeoff.
- OpenCV handles frame/video I/O and preprocessing efficiently.
- Torch backend supports CPU/GPU acceleration as needed.

---

## Updated Project Structure (High-Level)

```
Santinel AI/
├── backend/
│   ├── app/
│   │   ├── api/        # auth, cameras, alerts, dispatch, directory, health, demo
│   │   ├── core/       # config, auth deps, security, yolo_inference
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/     # incidents, protected
│   │   ├── schemas/
│   │   └── services/
│   ├── model/          # training scripts + YOLO runs/weights
│   ├── uploads/videos/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   └── pages/      # Dashboard, Incidents, AlertsHelp, Analytics, Login
│   └── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (recommended for full persistence)

### Backend Setup

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=sentinel_new
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Optional Clerk backend auth
# CLERK_SECRET_KEY=sk_test_xxx
```

Run backend:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

Set frontend env (`frontend/.env`) for Clerk login:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

Run frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in terminal (typically `http://localhost:5173`).

---

## API Overview (Current Major Endpoints)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend status |
| GET | `/health` | API health |
| GET | `/health/db` | DB connectivity check |
| GET | `/auth/status` | Auth mode status (Clerk/demo) |
| POST | `/auth/login` | Legacy login compatibility |
| GET | `/auth/me` | Current user profile |
| POST | `/incidents/report` | Manual incident creation |
| GET | `/incidents/all` | Incident list |
| PATCH | `/incidents/{incident_id}/status` | Incident status update |
| POST | `/incidents/detect-frame` | Single-frame detection |
| POST | `/incidents/create-from-detection` | Persist live detection as incident |
| POST | `/incidents/detect-from-video` | Video detection + incident generation |
| GET | `/cameras` | List cameras |
| POST | `/cameras` | Create camera |
| PATCH | `/cameras/{camera_id}/status` | Update camera status |
| GET | `/cameras/stream-proxy` | Proxy camera stream |
| GET | `/cameras/stream-check` | Check camera stream reachability |
| GET | `/alerts` | List alerts |
| PATCH | `/alerts/{alert_id}/acknowledge` | Acknowledge alert |
| GET | `/dispatch` | List dispatch records |
| POST | `/dispatch` | Create dispatch record |
| GET | `/dispatch/{incident_id}` | Get dispatch by incident |
| GET | `/directory` | Directory entries (role-protected) |
| GET | `/protected/admin` | Admin-only protected test route |
| GET | `/protected/police` | Police-only protected test route |
| POST | `/demo/seed` | Seed demo data |

---

## License

Private / Proprietary
