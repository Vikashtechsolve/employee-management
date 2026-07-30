# WorkPulse — Employee Attendance & Work Management

MERN monorepo for company-grade attendance driven by **daily work submissions** (with Cloudflare R2 proof files), leave management, ticketing, and role-based dashboards.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19 + Vite + Tailwind + TanStack Query + Zustand |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Files | Cloudflare R2 (S3-compatible); local-dev metadata fallback if R2 env is empty |

## Roles

`super_admin` · `admin` · `hr` · `manager` · `employee`

## How attendance works

1. Employee submits daily work (title, description, hours) **with at least one screenshot/file**.
2. System marks **Present** if submitted before cutoff, else **Late**.
3. Approved leave → `on_leave`. Holidays/weekends handled automatically.
4. Nightly cron marks **Absent** when no work and no leave.
5. Manager/Admin can override with reason (audited).

## Project structure

```
client/   # Vite React SPA
server/   # Express API
```

## Setup

### 1. Prerequisites

- Node.js 20+
- MongoDB running locally (or Atlas URI)

### 2. Install

```bash
cd server && npm install
cd ../client && npm install
```

Optional root helper:

```bash
npm install -g concurrently   # if using root `npm run dev`
```

### 3. Environment

Copy `server/.env.example` → `server/.env` (a starter `.env` is already present for local dev).

**MongoDB**

```
MONGODB_URI=mongodb://127.0.0.1:27017/ems
```

**Cloudflare R2** (required for real file storage)

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=ems-attachments
R2_PUBLIC_URL=https://files.yourdomain.com
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

If R2 vars are empty, uploads still succeed in **dev fallback** mode (metadata stored; binary not uploaded). Add R2 credentials before production.

### 4. Seed demo data

```bash
cd server && npm run seed
```

Demo logins:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | admin@company.com | Admin@12345 |
| Admin | admin.user@company.com | Admin@12345 |
| HR | hr@company.com | Hr@123456 |
| Manager | manager@company.com | Manager@123 |
| Employee | riya@company.com | Employee@123 |

### 5. Run

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

- API: http://localhost:5050  
- App: http://localhost:5173  

Vite proxies `/api` → `http://localhost:5050`.

## Main API areas

- `POST /api/auth/login`
- `POST /api/worklogs` (multipart) — submit work + files → attendance
- `GET /api/attendance/*`
- `POST /api/leaves/apply` · review/cancel
- `CRUD /api/tickets`
- `GET /api/dashboard` — role-aware
- `GET /api/files/signed-url?key=` — R2 signed download

## Features included

- JWT auth + refresh
- Employee directory (create / deactivate)
- Departments, holidays, company settings
- Daily work logs with R2 attachments
- Attendance calendar/list + CSV export + overrides
- Leave types, balances, apply/approve
- Ticketing with comments, priorities, deadlines
- Employee / Manager / Admin dashboards
- Nightly absent-marking cron
