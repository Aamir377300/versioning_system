# Document Versioning System

A full-stack document management platform with version history, role-based access control, and audit logging. Built with Django REST Framework, React, PostgreSQL, and Redis.

---

## Tech Stack

- **Backend:** Django 5+, Django REST Framework, SimpleJWT, PostgreSQL, Redis
- **Frontend:** React 19, Vite, Axios, Lucide React
- **Infrastructure:** Docker, Docker Compose

## Features

- JWT authentication with role-based access (Admin / Editor / Viewer)
- Full document version history with change notes
- Version rollback and diff comparison
- Soft delete & document recovery
- Audit logging for all actions
- Redis caching and API rate limiting

---

## Option 1 — Run with Docker (Recommended)

The easiest way. Docker handles PostgreSQL, Redis, backend, and frontend automatically.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed

### Steps

**1. Clone the repository**

```bash
git clone <your-repo-url>
cd Versoning_System
```

**2. Set up the environment file**

```bash
cp backend/.env.example backend/.env
```

The default `.env` values work out of the box with Docker. No changes needed.

**3. Build and start all services**

```bash
docker compose up --build
```

if you do some changes then 
```bash
docker compose down
docker compose up --build
```

This will start:
| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| Postgres | localhost:5433             |
| Redis    | localhost:6379             |

Migrations run automatically on startup.

**4. Seed the database (first time only)**

Open a new terminal while the containers are running:

```bash
docker compose exec backend python seed.py
```

**5. Open the app**

Go to http://localhost:3000 and log in with:

```
Username: admin_user
Password: password123
```

### Stopping

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

## Option 2 — Run Manually (Backend & Frontend Separately)

Use this if you prefer running services directly in your terminal without Docker.

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15 running locally
- Redis running locally

---

### Backend Setup

**1. Navigate to the backend folder**

```bash
cd Versoning_System/backend
```

**2. Create and activate a virtual environment**

```bash
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and update the database and Redis connection values to match your local setup:

```env
DEBUG=True
SECRET_KEY=django-insecure-development-key-only
POSTGRES_DB=doc_versioning
POSTGRES_USER=admin
POSTGRES_PASSWORD=secretpassword
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/1
ALLOWED_HOSTS=localhost,127.0.0.1
```

**5. Create the PostgreSQL database**

```bash
psql -U postgres -c "CREATE DATABASE doc_versioning;"
```

**6. Run migrations**

```bash
python manage.py migrate
```

**7. Seed the database**

```bash
python seed.py
```

**8. Start the backend server**

```bash
python manage.py runserver
```

Backend runs at http://localhost:8000

---

### Frontend Setup

Open a **new terminal tab/window**.

**1. Navigate to the frontend folder**

```bash
cd Versoning_System/frontend
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm run dev
```

Frontend runs at http://localhost:5173

**4. Open the app**

Go to http://localhost:5173 and log in with:

```
Username: admin_user
Password: password123
```

---

## Accessing the PostgreSQL Database

There are two ways to inspect the database depending on whether you prefer a GUI or the terminal.

### Option A — Django Admin Panel (Easiest)

Django ships with a built-in admin UI that lets you browse all tables visually.

**Important:** You need a superuser account to access the admin panel. Create one before starting.

**If using Docker:**

```bash
docker compose exec backend python manage.py createsuperuser
```

**If running manually** (make sure you're inside `backend/` with your venv activated):

```bash
# Common mistake — manage.py lives inside backend/, not the project root
# Wrong:  python manage.py createsuperuser          (from Versoning_System/)
# Right:  run from backend/ with the venv Python

source venv/bin/activate
python manage.py createsuperuser
```

Or non-interactively with a preset password:

```bash
DJANGO_SUPERUSER_PASSWORD=admin123 python manage.py createsuperuser --username admin --email admin@admin.com --noinput
```

Then:

1. Make sure the backend is running (Docker or manual)
2. Open http://localhost:8000/admin in your browser
3. Log in with the superuser credentials you just created

From here you can browse and edit Documents, Document Versions, Users, User Profiles, and Audit Logs directly.

---

### Option B — psql CLI

**If using Docker:**

```bash
docker compose exec db psql -U postgres -d versioning_system
```

**If running manually:**

```bash
psql -U postgres -d versioning_system
```

Useful queries once inside the psql shell:

```sql
-- List all tables
\dt

-- See all users
SELECT id, username, email FROM auth_user;

-- See all documents
SELECT id, title, owner_id, is_deleted, created_at FROM api_document;

-- See all versions for a document
SELECT id, document_id, author_id, change_notes, created_at FROM api_documentversion ORDER BY created_at DESC;

-- See audit logs
SELECT user_id, action, timestamp, details FROM api_auditlog ORDER BY timestamp DESC;

-- Exit
\q
```

---

### Option C — GUI Client (pgAdmin / TablePlus / DBeaver)

Connect any PostgreSQL GUI client using these credentials:

| Field    | Value (Docker)  | Value (Manual)  |
|----------|-----------------|-----------------|
| Host     | `localhost`     | `localhost`     |
| Port     | `5433`          | `5432`          |
| Database | `versioning_system` | `versioning_system` |
| Username | `postgres`      | `postgres`      |
| Password | `g%4541A89`     | `g%4541A89`     |

> Note: Docker maps Postgres to port **5433** on your host to avoid conflicts with any local Postgres instance.

---

## API Endpoints

All endpoints are prefixed with `/api/`.

| Method | Endpoint                                        | Description                  | Auth Required |
|--------|-------------------------------------------------|------------------------------|---------------|
| POST   | `/api/register/`                                | Register a new user          | No            |
| POST   | `/api/token/`                                   | Obtain JWT token (login)     | No            |
| POST   | `/api/token/refresh/`                           | Refresh JWT token            | No            |
| GET    | `/api/documents/`                               | List all documents           | Yes           |
| POST   | `/api/documents/`                               | Create a new document        | Yes (Editor+) |
| GET    | `/api/documents/{id}/`                          | Get document with versions   | Yes           |
| PUT    | `/api/documents/{id}/`                          | Update document (new version)| Yes (Editor+) |
| DELETE | `/api/documents/{id}/`                          | Soft delete a document       | Yes (Admin)   |
| POST   | `/api/documents/{id}/rollback/`                 | Rollback to a version        | Yes (Editor+) |
| GET    | `/api/documents/{id}/compare_versions/`         | Diff two versions            | Yes           |

---

## User Roles

| Role   | Permissions                                      |
|--------|--------------------------------------------------|
| Viewer | Read-only access to all documents                |
| Editor | Create, edit, and rollback documents             |
| Admin  | Full access including delete and user management |

---

## Project Structure

```
Versoning_System/
├── backend/
│   ├── api/              # Models, views, serializers, URLs
│   ├── config/           # Django settings and routing
│   ├── seed.py           # Database seeder
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React application
│   │   └── api.js        # Axios API client
│   └── package.json
└── docker-compose.yml
```
