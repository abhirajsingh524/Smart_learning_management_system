# NeuroXLearn (NeuroLearnX)

Full-stack **Smart LMS**: **Node.js + Express** (REST + JWT + Mongoose), optional **Python + FastAPI + PyMongo** analytics/AI microservice, **Docker Compose**, and two UI layers:

1. **Classic pages** — original learning routes (`/`, `/learning`, …) + legacy auth pages (`/student/login`, …).
2. **NeuroX LMS** — modern glass-style shell: start at **`/login`** (Student | Admin toggle), then **`/lms/student/*`** or **`/lms/admin/*`**.

HTML is rendered with **Nunjucks** (Jinja-style `{% extends %}`). Static assets live under `static/`.

---

## Quick start (Windows CMD)

```cmd
cd d:\github_Projects\Smart_learning_management_system\NeuroLearnX
npm install
copy .env.example .env
```

Edit `.env`: set **`MONGO_URI`** (Atlas or local) and **`JWT_SECRET`**. For Python integration locally, set **`PYTHON_SERVICE_URL=http://localhost:8000`** (see Python section below).

### Run Node (API + all HTML)

```cmd
node server\server.js
```

Dev (auto-restart):

```cmd
npx nodemon server\server.js
```

- **Classic home:** http://localhost:5000/
- **NeuroX LMS login:** http://localhost:5000/login  
- **Student LMS (after login):** http://localhost:5000/lms/student/dashboard  
- **Admin LMS:** http://localhost:5000/lms/admin/dashboard  

### Run Python service (optional, separate terminal)

```cmd
cd python-service
pip install -r requirements.txt
set MONGO_URI=your_same_mongo_uri
uvicorn main:app --host 0.0.0.0 --port 8000
```

Health: `GET http://localhost:8000/health`  
Analytics: `GET http://localhost:8000/analytics/summary`  
AI echo: `POST http://localhost:8000/ai/chat` with JSON `{"message":"..."}`  

---

## Docker Compose

From the project root (with `.env` configured; Atlas URL is fine):

```cmd
docker compose up --build
```

- **Backend:** http://localhost:5000  
- **Python:** http://localhost:8000  
- **Nginx (reverse proxy):** http://localhost:80 → forwards to backend  

Optional **local MongoDB** (profile):

```cmd
docker compose --profile localmongo up --build
```

Then point `MONGO_URI` at `mongodb://mongo:27017/neurolx` inside Compose.

---

## Default admin (seeded on server start)

If no user exists with this email:

- **Email:** `admin@neuroxlearn.com`  
- **Password:** `Admin@123`  
- **Role:** `admin`  

Sign in via **`/login`** (Admin tab) or legacy **`/admin/login`**.

---

## Content seed

On successful DB connection, the server also runs **`seedContent`**: demo **courses**, **weekly quizzes**, and enrolls **all students** in published courses. New **student registrations** auto-enroll in all published courses.

---

## API summary

### Auth

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/student/register` | Student signup |
| POST | `/api/auth/login` | Unified login (returns role in JWT) |
| POST | `/api/auth/student/login` | Student-only |
| POST | `/api/auth/admin/login` | Admin-only |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Clears cookie; client clears `localStorage` |

### Student (JWT + role `student`)

| Method | Path |
|--------|------|
| GET | `/api/student/dashboard` |
| GET | `/api/student/courses` |
| GET | `/api/student/courses/:courseId` |
| GET | `/api/student/quizzes/:quizId` (no correct answers) |
| POST | `/api/student/quiz/attempt` body: `{ quizId, answers[], durationMs }` |
| GET/PUT | `/api/student/profile` |

### Admin (JWT + role `admin`)

| Method | Path |
|--------|------|
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/analytics` |
| GET | `/api/admin/students` (`?q=` search) |
| GET | `/api/admin/students/:id` |
| PUT | `/api/admin/students/:id` (incl. `enrolledCourses` array) |
| DELETE | `/api/admin/students/:id` |

### AI

| Method | Path |
|--------|------|
| POST | `/api/ai/chat` — authenticated; Node may forward to `PYTHON_SERVICE_URL` |

### Public (legacy UI helpers)

`GET /api/dashboard`, `GET /api/quiz`, `POST /api/tutor`, `POST /api/lab/run`

---

## MongoDB collections (Mongoose)

| Collection | Purpose |
|------------|---------|
| `users` | `name`, `email`, `password`, `role`, `enrolledCourses[]`, `lastActiveAt`, … |
| `courses` | `title`, `slug`, `description`, `modules[]`, `quizIds[]` |
| `quizzes` | `courseId`, `weekNumber`, `questions[]` (options + `correctAnswer` index) |
| `quizattempts` | `userId`, `quizId`, `courseId`, `score`, `maxScore`, `answers`, `durationMs` |

---

## Project layout (key paths)

| Path | Role |
|------|------|
| `server/server.js` | Env, DB, `seedAdmin`, `seedContent`, HTTP |
| `server/app.js` | Express, static, Nunjucks routes, `/api/*` |
| `server/models/` | `User`, `Course`, `Quiz`, `QuizAttempt` |
| `server/controllers/` | Auth, student, admin, AI |
| `server/services/` | `pythonAnalytics.js`, `pythonAi.js` |
| `server/utils/seedContent.js` | Demo courses + quizzes |
| `python-service/` | FastAPI + PyMongo |
| `docker-compose.yml`, `Dockerfile`, `docker/nginx.conf` | Containers |
| `templates/lms_*.html` | NeuroX LMS pages |
| `static/css/lms.css`, `static/js/lms-*.js` | LMS UI |

---

## Flask (`app.py`)

A separate **Flask** app on port **5000** conflicts with this Node server. Use one or the other, or run Flask on another port.

---

## npm reference (from scratch)

```cmd
npm init -y
npm install express mongoose bcryptjs jsonwebtoken dotenv cors cookie-parser nunjucks
npm install -D nodemon
```

This repo already includes a `package.json` with these dependencies.
