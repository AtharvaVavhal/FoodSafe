# 🌿 FoodSafe — All Commands Reference

## 1. CLONE & SETUP (First time)

```bash
# Clone from GitHub (after you push)
git clone https://github.com/YOUR_USERNAME/foodsafe.git
cd foodsafe
```

---

## 2. FRONTEND SETUP

```bash
cd frontend

# Install all dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server → http://localhost:3000
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 3. BACKEND SETUP

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install all Python packages
pip install -r requirements.txt

# Copy and fill env file
cp .env.example .env
# Edit .env → add ANTHROPIC_API_KEY

# Run database migrations
alembic upgrade head

# Seed initial data (safe brands + FSSAI violations)
python seed.py

# Start dev server → http://localhost:8000
uvicorn main:app --reload --port 8000

# View API docs
# Open: http://localhost:8000/docs
```

---

## 4. DOCKER (Full stack — easiest)

```bash
# From root of project
cp backend/.env.example .env
# Edit .env → add ANTHROPIC_API_KEY=sk-ant-...

# Build and start everything
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop everything
docker-compose down

# Stop and delete all data
docker-compose down -v
```

**What Docker starts:**
| Service   | Port | What                        |
|-----------|------|-----------------------------|
| frontend  | 3000 | React app (Nginx)           |
| backend   | 8000 | FastAPI + auto docs         |
| db        | 5432 | PostgreSQL                  |
| redis     | 6379 | Redis cache                 |
| worker    | —    | Celery async ML tasks       |

---

## 5. DATABASE

```bash
cd backend

# Run all migrations (creates tables)
alembic upgrade head

# Create a new migration after changing models
alembic revision --autogenerate -m "describe change"

# Check current migration version
alembic current

# Rollback one migration
alembic downgrade -1

# Seed initial data
python seed.py
```

---

## 6. CELERY (Async tasks)

```bash
cd backend

# Start Celery worker (processes ML tasks + scraper)
celery -A tasks worker --loglevel=info

# Start Celery beat (scheduler — weekly FSSAI scrape, nightly retrain)
celery -A tasks beat --loglevel=info

# Run both together
celery -A tasks worker --beat --loglevel=info

# Run a task manually
python -c "from tasks.scraper_tasks import run_fssai_scraper; run_fssai_scraper.delay()"
python -c "from tasks.ml_tasks import retrain_risk_model; retrain_risk_model.delay()"
```

---

## 7. TESTS

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_api.py -v

# Run with coverage
pip install pytest-cov
pytest --cov=. --cov-report=html
# Open: htmlcov/index.html
```

---

## 8. GIT WORKFLOW

```bash
# First push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/foodsafe.git
git branch -M main
git push -u origin main

# Daily workflow
git add -A
git commit -m "feat: your change description"
git push

# Create feature branch
git checkout -b feature/whatsapp-bot
git push -u origin feature/whatsapp-bot

# View commit history
git log --oneline

# View all changes
git status
git diff
```

---

## 9. WHATSAPP BOT SETUP

```bash
# 1. Sign up free at: https://www.twilio.com
# 2. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
# 3. Note your sandbox number and join keyword

# 4. Expose local backend (for testing)
pip install ngrok
ngrok http 8000
# Copy the https URL e.g. https://abc123.ngrok.io

# 5. Set webhook in Twilio console:
# URL: https://abc123.ngrok.io/api/whatsapp/webhook
# Method: POST

# 6. From your phone WhatsApp, send:
# "join <your-sandbox-keyword>"
# to the Twilio WhatsApp number

# 7. Now send any food name and get a scan result!
# Try: "turmeric" or "हल्दी" or "हळद"
```

---

## 10. ML NOTEBOOKS (Google Colab — free GPU)

```bash
# Upload ml/notebooks/ folder to Google Drive
# Open each in Colab → Runtime → Change runtime → T4 GPU

# Run in order:
# 01_yolov8_food_detection.ipynb    (~2 hours)
# 02_indicbert_nlp.ipynb            (~1 hour)
# 03_prophet_seasonal_prediction.ipynb  (~10 min)
# 04_model_evaluation.ipynb         (~5 min)

# Download trained models to ml/models/
# - foodsafe_yolo/weights/best.pt
# - muril_foodsafe/
# - prophet_turmeric.pkl
```

---

## 11. DEPLOYMENT (Free hosting)

### Frontend → Vercel
```bash
npm install -g vercel
cd frontend
vercel login
vercel          # follow prompts → auto-deploys from GitHub
# Set env var: VITE_API_URL=https://your-backend.onrender.com
```

### Backend → Render
```
1. Go to render.com → New → Web Service
2. Connect GitHub → select foodsafe repo
3. Root Directory: backend
4. Build Command: pip install -r requirements.txt
5. Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
6. Add env vars:
   ANTHROPIC_API_KEY = sk-ant-...
   DATABASE_URL      = postgresql+asyncpg://... (from Supabase)
   SECRET_KEY        = any-random-32-char-string
   REDIS_URL         = rediss://... (from Upstash)
```

### Database → Supabase (free)
```
1. supabase.com → New Project
2. Settings → Database → Connection string → Transaction mode
3. Copy: postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:6543/postgres
4. Add as DATABASE_URL in Render env vars
5. Run: alembic upgrade head (in Render shell or locally)
```

### Redis → Upstash (free)
```
1. upstash.com → Create Database → Redis
2. Copy REST URL → add as REDIS_URL in Render
```

---

## 12. ADMIN DASHBOARD

```
# Access at:
http://localhost:3000/admin      (local dev)
https://your-app.vercel.app/admin  (production)

# Tabs available:
- Overview   → stats, risk distribution chart
- Scans      → live recent scan feed
- Community  → user adulteration reports
- FSSAI      → violation database
- ML         → model status + Celery jobs
```

---

## 13. ALL URLS (local dev)

| URL | What |
|-----|------|
| http://localhost:3000 | Main app |
| http://localhost:3000/admin | Admin dashboard |
| http://localhost:8000/docs | API Swagger docs |
| http://localhost:8000/redoc | API ReDoc docs |
| http://localhost:8000/health | Health check |

---

## 14. ENVIRONMENT VARIABLES

### backend/.env
```
ANTHROPIC_API_KEY=sk-ant-api03-...
DATABASE_URL=postgresql+asyncpg://foodsafe:foodsafe_dev@localhost:5432/foodsafe
REDIS_URL=redis://localhost:6379
SECRET_KEY=change-this-to-a-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=["http://localhost:3000"]
APP_ENV=development
```

### frontend/.env
```
VITE_API_URL=http://localhost:8000
```

---

## 15. TROUBLESHOOTING

```bash
# Port already in use
lsof -i :3000   # find process
lsof -i :8000
kill -9 <PID>

# Python module not found
pip install -r requirements.txt
# Make sure venv is activated!

# Alembic migration error
alembic downgrade base   # reset all
alembic upgrade head     # redo

# Frontend won't start
rm -rf node_modules
npm install
npm run dev

# Docker postgres won't start
docker-compose down -v   # delete volumes
docker-compose up --build

# Claude API error
# Check ANTHROPIC_API_KEY in .env
# Make sure key starts with sk-ant-
```
