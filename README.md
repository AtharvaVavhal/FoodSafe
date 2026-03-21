# 🌿 FoodSafe — AI-Powered Food Adulteration Detection

> A research-grade, full-stack web application for detecting food adulteration using AI, computer vision, and NLP in Hindi/Marathi/English.

## 🎯 Project Overview

FoodSafe helps Indian families detect food adulteration using:
- **Real-time camera detection** (YOLOv8)
- **Native Hindi/Marathi NLP** (IndicBERT/MuRIL)
- **Predictive risk scoring** (Prophet time-series)
- **Personalized health profiles** (scikit-learn)
- **FSSAI violation data integration**

## 📁 Project Structure

```
foodsafe/
├── frontend/          # React.js web app
├── backend/           # FastAPI Python backend
├── ml/                # ML models, notebooks, training scripts
└── docs/              # Research paper, API docs
```

## 🛠️ Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | React.js, Tailwind CSS, Leaflet.js       |
| Backend     | FastAPI, PostgreSQL, Redis, Celery       |
| AI/ML       | Claude API, YOLOv8, IndicBERT, Prophet  |
| Hosting     | Vercel (FE), Render (BE), Supabase (DB) |
| Cost        | ₹0 (all free tiers)                     |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL
- Redis

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 🔬 Research Questions

1. Can multimodal AI detect food adulteration more accurately than single-modality approaches?
2. How does regional NLP (Hindi/Marathi) improve food safety awareness vs English-only?
3. Can time-series ML on FSSAI data predict seasonal adulteration spikes?
4. What is the impact of personalized toxin exposure scoring on dietary behaviour?

## 📄 License

MIT License — open for research and educational use.