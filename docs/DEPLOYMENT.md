# 🚀 Deployment Guide — FoodSafe

## Push to GitHub

```bash
# 1. Create a new repo on github.com (name: foodsafe)
# 2. Add remote and push:

cd foodsafe
git remote add origin https://github.com/YOUR_USERNAME/foodsafe.git
git branch -M main
git push -u origin main
```

---

## Free Hosting Setup

### Frontend → Vercel (Free)
```bash
npm install -g vercel
cd frontend
vercel          # follow prompts
# Set env: VITE_API_URL = https://your-backend.onrender.com
```

### Backend → Render (Free)
1. Go to render.com → New Web Service
2. Connect your GitHub repo
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add env vars:
   - `ANTHROPIC_API_KEY` = your key
   - `DATABASE_URL` = from Supabase
   - `SECRET_KEY` = random 32 char string

### Database → Supabase (Free)
1. supabase.com → New Project
2. Copy connection string (Transaction mode)
3. Format: `postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres`
4. Run migrations:
   ```bash
   cd backend
   alembic upgrade head
   python seed.py
   ```

### Redis → Upstash (Free)
1. upstash.com → New Redis Database
2. Copy Redis URL
3. Add to env: `REDIS_URL = rediss://...`

---

## Local Development

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/foodsafe.git
cd foodsafe

# Backend
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Fill in your keys
alembic upgrade head
python seed.py
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# Open: http://localhost:3000
```

## Docker (Full Stack)
```bash
cp .env.example .env     # fill ANTHROPIC_API_KEY
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/docs
```

---

## ML Notebooks (Google Colab — Free GPU)

1. Upload `ml/notebooks/` to Google Drive
2. Open in Colab → Runtime → T4 GPU
3. Run in order:
   - `01_yolov8_food_detection.ipynb`  (~2h)
   - `02_indicbert_nlp.ipynb`          (~1h)
   - `03_prophet_seasonal_prediction.ipynb` (~10min)
4. Download trained models to `ml/models/`

---

## GitHub Actions Secrets (for auto-deploy)

In your GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | From vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From vercel project settings |
| `VERCEL_PROJECT_ID` | From vercel project settings |
| `RENDER_DEPLOY_HOOK` | From render service settings |
