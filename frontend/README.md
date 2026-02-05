# Sentinel Frontend (React + Vite)

This frontend implements the Sentinel AI dashboard and incident management UI. It is built with React, Vite, Tailwind CSS (v4), and React Router. It consumes the Sentinel backend API running at `http://127.0.0.1:8000`.

## Tech Stack
- React 19, Vite 7, React Router 7
- Tailwind CSS 4 via `@tailwindcss/vite`
- Recharts for analytics visuals
- Axios for API calls
- ESLint 9 for linting

## Features Added
- Dashboard layout with global navbar and live alerts panel
- Camera management:
  - Local webcam feed (browser permission required)
  - IP/MJPEG camera via URL
  - Video file upload preview
  - API cameras loaded from backend and selectable
  - Add Camera modal to create cameras via API
- Incident management:
  - Incident table with search, filters (severity/status/type), sorting
  - Status update with optimistic UI (open/in_progress/resolved)
  - Quick dispatch action and “View Feed” navigation
  - Demo incident seeding when list is empty
- Alerts & Help:
  - Live alert stream (polling every 5s), severity-based grouping
  - Nearby services directory with Dispatch/Call/Mark Contacted
- Analytics:
  - Incidents over time (Area chart)
  - Incidents by severity (Pie/Bar)
- Auth:
  - Login page and token persistence in localStorage
  - Logout control in navbar
  - ProtectedRoute helper available for gated pages
- Styling:
  - Tailwind-based dark UI, global theme tokens and base styles

## Project Structure
- App and routing: [App.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/App.jsx)
- Entry point: [main.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/main.jsx)
- Layout: [DashboardLayout.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/layouts/DashboardLayout.jsx)
- Navbar: [Navbar.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/components/Navbar.jsx)
- Alerts panel: [AlertPanel.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/components/AlertPanel.jsx)
- Pages:
  - Dashboard: [Dashboard.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/Dashboard.jsx)
  - Incidents: [Incidents.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/Incidents.jsx)
  - Analytics: [Analytics.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/Analytics.jsx)
  - Alerts & Help: [AlertsHelp.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/AlertsHelp.jsx)
  - Admin (placeholder): [Admin.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/Admin.jsx)
  - Login: [Login.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/Login.jsx)
- Camera feeds: [CameraFeed.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/components/CameraFeed.jsx)
- Add camera modal: [AddCameraModal.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/components/AddCameraModal.jsx)
- Contexts:
  - Cameras: [CameraContext.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/context/CameraContext.jsx)
  - Incidents: [IncidentContext.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/context/IncidentContext.jsx)
  - Alerts: [AlertContext.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/context/AlertContext.jsx)
  - Auth: [AuthContext.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/context/AuthContext.jsx)
- API clients:
  - Base axios client: [axios.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/axios.js#L5-L10)
  - Cameras: [cameras.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/cameras.js)
  - Alerts: [alerts.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/alerts.js)
  - Incidents: [incidents.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/incidents.js)
  - Dispatch: [dispatch.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/dispatch.js)
  - Directory: [directory.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/directory.js)

## Backend API Requirement
- The frontend expects the backend at `http://127.0.0.1:8000`.
- To change the API base URL, edit [axios.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/axios.js#L5-L10).
- Endpoints used include `/auth/*`, `/cameras`, `/incidents/*`, `/alerts`, `/dispatch`, `/directory`.

## Prerequisites
- Node.js 18+ (recommended 20+)
- npm 9+ (or compatible)

## Setup
1. Install dependencies:
   - `npm ci` (preferred with lockfile) or `npm install`
2. Configure backend:
   - Ensure the Sentinel backend runs at `http://127.0.0.1:8000`.
   - If different, update the base URL in [axios.js](file:///C:/Users/lenovo/sentinel_new/frontend/src/api/axios.js#L5-L10).

## Development
- Start dev server: `npm run dev`
- Default port: `5173` (Vite)

## Build & Preview
1. Build production assets: `npm run build`
2. Preview locally: `npm run preview`

The static output is generated in `dist/` (HTML/CSS/JS).

## Useful Notes
- Alerts polling interval: 5 seconds (see [AlertContext.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/context/AlertContext.jsx#L7-L8)).
- Demo incident seeding occurs when the list is empty (see [Incidents.jsx](file:///C:/Users/lenovo/sentinel_new/frontend/src/pages/Incidents.jsx#L322-L344)).
- Tailwind CSS is enabled via [vite.config.js](file:///C:/Users/lenovo/sentinel_new/frontend/vite.config.js) and `src/index.css`.
- ESLint is available: `npm run lint`.

## Scripts
- `npm run dev` — start development server
- `npm run build` — build for production
- `npm run preview` — preview built assets
- `npm run lint` — run ESLint
