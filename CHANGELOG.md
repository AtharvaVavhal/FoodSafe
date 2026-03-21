# Changelog — FoodSafe

## [0.3.0] - WhatsApp Bot + Admin + Research Paper
### Added
- WhatsApp bot via Twilio sandbox (routers/whatsapp.py)
  - Supports EN/HI/MR via `lang hi` command
  - Food scan, symptom check, brand query
  - Session memory per phone number
  - Seasonal alert appended to every scan
- Admin dashboard (pages/AdminDashboard.jsx)
  - Overview: total scans, today, high-risk count, active users
  - Live scan feed with risk badges
  - Community reports moderation view
  - FSSAI violations database view
  - ML model status panel (YOLOv8, MuRIL, Prophet, Celery)
- ML model evaluation notebook (04_model_evaluation.ipynb)
  - YOLOv8 per-class mAP50 chart
  - MuRIL vs translation baseline comparison
  - Prophet prediction vs actual chart
  - User study results + statistical significance (chi-square)
  - Full Table II for research paper
- Research paper draft (docs/research_paper_draft.md)
  - IEEE conference format
  - Abstract, 8 sections, full results tables
  - References for MuRIL, Prophet, FSSAI, ICMR
  - Target: ICACCI 2025 / IEEE ICTAI 2025

## [0.2.0] - Docker + Migrations + ML Notebooks
### Added
- docker-compose.yml: postgres, redis, backend, frontend, celery worker
- Alembic migrations: 001_create_all_tables
- seed.py: 12 safe brands + 8 FSSAI violations
- Celery tasks: weekly FSSAI scraper + nightly model retraining
- ML notebooks: YOLOv8, IndicBERT/MuRIL, Prophet
- GitHub Actions CI/CD pipeline
- 7 backend API tests
- DEPLOYMENT.md guide

## [0.1.0] - Initial Scaffold
### Added
- Full directory structure: frontend/, backend/, ml/
- React frontend: 8 pages, Zustand store, EN/HI/MR i18n
- FastAPI backend: 6 routers, 6 DB models, Claude AI service
- ML risk scorer with personalization + seasonal rules
- FSSAI scraper with seed violation data
