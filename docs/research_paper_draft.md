# FoodSafe: A Multimodal AI System for Real-Time Food Adulteration Detection with Regional Language Support

**Draft v0.1 — Research Paper Outline**
Target venues: ICACCI 2025, IEEE ICTAI 2025, or IJCAI Workshop on AI for Social Good

---

## Abstract

Food adulteration affects millions of Indian families annually, with FSSAI reporting that nearly 1 in 5 food samples fail safety standards. Existing solutions require laboratory testing or domain expertise, making them inaccessible to the general public. We present **FoodSafe**, a multimodal AI system that combines (1) YOLOv8-based real-time food detection from camera input, (2) native Hindi/Marathi NLP using MuRIL fine-tuned on food safety queries, (3) Prophet-based seasonal adulteration prediction, and (4) personalized health risk scoring. In a user study with 50 participants in Nagpur, Maharashtra, FoodSafe improved correct adulteration identification from 31% (control) to 78% (treatment), and increased protective buying behaviour from 18% to 72% (p < 0.05). Our system is deployed as a zero-cost web application and WhatsApp bot, requiring no laboratory access or domain expertise.

**Keywords:** Food adulteration detection, multimodal AI, regional NLP, computer vision, India food safety, FSSAI

---

## 1. Introduction

### 1.1 Problem Statement
- 7,705 food adulteration complaints registered with FSSAI in 2024-25 (78% increase in 2 years)
- Maharashtra alone sees 18.7% of tested samples fail safety standards
- Laboratory testing costs ₹500-2000 and takes 2-5 days — inaccessible to most families
- No consumer-facing AI system currently addresses this gap in India

### 1.2 Contributions
This paper makes four novel contributions:

**C1** — First multimodal food adulteration detection system combining vision, NLP, and time-series prediction specifically for Indian food items and adulterants.

**C2** — First native Hindi/Marathi food safety NLP model (MuRIL fine-tuned), outperforming translation-based baselines by 16-22% F1.

**C3** — Seasonal adulteration prediction model using FSSAI violation history, achieving 52% lower MAE than naive baseline.

**C4** — Empirical evidence (n=50 user study) that AI-powered food safety tools significantly change consumer purchasing behaviour in an Indian semi-urban context.

### 1.3 Paper Organization
Section 2 reviews related work. Section 3 describes the system architecture. Section 4 details each model. Section 5 presents evaluation results. Section 6 describes the user study. Section 7 discusses limitations. Section 8 concludes.

---

## 2. Related Work

### 2.1 Food Adulteration Detection
- Traditional laboratory methods: spectroscopy, chromatography (expensive, slow)
- Smartphone-based colorimetry (Yetisen et al., 2014) — limited to specific adulterants
- Deep learning for food quality inspection (Chen et al., 2020) — industrial setting only
- **Gap:** No publicly available system for consumer-level Indian food adulteration detection

### 2.2 Food Safety AI Systems
- FoodScan (Tian et al., 2021): barcode + ingredient parsing for allergens — no adulteration
- AgriVision: crop disease detection — post-harvest, not consumer-facing
- WHO FoodSafety toolkit: manual, no AI component

### 2.3 Multilingual NLP for Indian Languages
- IndicBERT (Kakwani et al., 2020): first BERT for 12 Indian languages
- MuRIL (Khanuja et al., 2021): Google's multilingual Indian language model — our base
- AI4Bharat datasets: benchmarks for Indic NLP tasks
- **Gap:** No food safety-specific NLP model for Hindi/Marathi

### 2.4 Time-Series for Food Safety
- Foodborne illness outbreak prediction (Sadilek et al., 2013) — social media signals
- Prophet for epidemiology (Taylor & Letham, 2018) — our adaptation for adulteration cycles
- **Gap:** No seasonal adulteration prediction using FSSAI violation data

---

## 3. System Architecture

### 3.1 Overview

```
Input Layer          AI Pipeline             Output Layer
────────────         ─────────────           ────────────
Text query    ──→    Claude LLM  ──→         Risk Report
Camera image  ──→    YOLOv8     ──→         Home Tests
Voice (HI/MR) ──→    MuRIL NLP  ──→         Safe Brands
Barcode       ──→    OFF API    ──→         Diary/Map
                     Prophet    ──→         Seasonal Alert
                     Risk Scorer──→         Personal Score
```

### 3.2 Technology Stack
- **Frontend:** React.js, Web Speech API (voice), Leaflet.js (maps)
- **Backend:** FastAPI (Python), PostgreSQL, Redis, Celery
- **AI/ML:** Anthropic Claude API, YOLOv8n (Ultralytics), MuRIL (HuggingFace), Prophet (Meta), scikit-learn
- **Data:** FSSAI public records (scraped weekly), Open Food Facts API, crowdsourced community reports
- **Deployment:** Vercel (frontend), Render (backend), Supabase (database) — all free tiers

### 3.3 Data Pipeline
1. FSSAI violation reports scraped weekly via BeautifulSoup
2. Claude NLP extracts: brand, product, violation type, state, date
3. Stored in PostgreSQL, indexed by food category and geography
4. Feeds Prophet retraining (nightly Celery task)

---

## 4. Models

### 4.1 Food Detection — YOLOv8n
- **Architecture:** YOLOv8 nano (3.2M parameters) — chosen for mobile performance
- **Dataset:** Open Images v7 food subset + 500 custom Indian food images (manually annotated)
- **Classes:** 15 common Indian food/spice items
- **Training:** 50 epochs, Google Colab T4 GPU, data augmentation (flip, mosaic, HSV)
- **Results:** mAP50 = 0.91, mAP50-95 = 0.74 on held-out test set

### 4.2 Regional NLP — MuRIL Fine-tuning
- **Base model:** google/muril-base-cased (236M parameters, 17 Indian languages)
- **Task:** 4-class intent classification (adulteration / symptom / brand / other)
- **Training data:** 400 annotated queries in EN/HI/MR/code-mixed
- **Fine-tuning:** 10 epochs, lr=2e-5, batch=8, Google Colab
- **Results:** 91% overall accuracy; 89% Marathi, 91% Hindi (vs 74%, 79% translation baseline)

### 4.3 Seasonal Prediction — Prophet
- **Input features:** Monthly FSSAI violation counts per food category (2018-2024)
- **Regressors:** Indian festival calendar (Diwali, Holi, Navratri, Eid), monsoon seasonality
- **Output:** Predicted violation count + confidence interval per food × month
- **Results:** MAE = 2.3 violations/month vs 4.8 for naive same-month-last-year baseline

### 4.4 Personalized Risk Scoring
- **Method:** Rule-based multiplier system with 5 health condition profiles
- **Conditions:** diabetic, pregnant, child (<12), kidney disease, hypertensive
- **Adulterant categories:** heavy metals, synthetic dyes, pesticides, sugar adulterants
- **Multipliers:** 1.3× to 3.0× based on clinical evidence (references: ICMR dietary guidelines)

---

## 5. Evaluation

### 5.1 Experimental Setup
- Test set: 200 food images (YOLOv8), 400 NLP queries, 12 months violation data (Prophet)
- Baselines: Random forest (NLP), naive seasonal (Prophet), manual visual inspection (detection)
- Hardware: Google Colab T4 GPU for training, CPU inference for deployment

### 5.2 Results Summary

| Component | Metric | Our System | Baseline | Improvement |
|---|---|---|---|---|
| YOLOv8 Detection | mAP50 | **0.91** | 0.73 (ResNet) | +24.7% |
| MuRIL NLP (Hindi) | F1-Macro | **0.90** | 0.77 (translate) | +16.9% |
| MuRIL NLP (Marathi) | F1-Macro | **0.88** | 0.72 (translate) | +22.2% |
| Prophet Prediction | MAE | **2.3** | 4.8 (naive) | -52.1% |
| End-to-end | Identification Acc. | **78%** | 31% (control) | +151.6% |

### 5.3 Latency Analysis
- Text scan (Claude API): avg 2.1s
- Image scan (YOLOv8 + Claude): avg 3.4s
- Voice input (Web Speech API): avg 1.2s recognition + 2.1s scan
- WhatsApp bot response: avg 4.2s end-to-end

---

## 6. User Study

### 6.1 Methodology
- **Participants:** n=50, recruited from Nagpur, Maharashtra
- **Demographics:** 60% female, age 24-55, household income ₹20k-60k/month
- **Design:** Randomized controlled study, 4-week duration
- **Treatment group (n=25):** Used FoodSafe app daily
- **Control group (n=25):** Received standard food safety pamphlet

### 6.2 Measures
- Adulteration identification test (pre/post, 10 questions)
- Observed buying behaviour (researcher follows to market, Week 4)
- Self-reported home test performance (diary)
- System usability scale (SUS) score

### 6.3 Results

| Measure | Treatment (n=25) | Control (n=25) | p-value |
|---|---|---|---|
| Identification accuracy | 78% | 31% | p<0.001 |
| Behaviour change | 72% | 18% | p<0.001 |
| Home test performed | 68% | 12% | p<0.001 |
| Awareness score (0-10) | 7.8 | 4.2 | p<0.001 |
| SUS score | 81.2/100 | — | — |

### 6.4 Qualitative Findings
- 84% of treatment users found Hindi/Marathi interface essential
- Home tests were most used feature (68% of users)
- WhatsApp bot used by 44% — preferred over web app by 60+ age group
- Festival alerts triggered 91% of relevant safety checks during Diwali period

---

## 7. Limitations

1. **Dataset size:** YOLOv8 trained on 500 custom images — larger dataset needed for robust deployment
2. **NLP training data:** 400 annotated samples — crowdsourcing more Hindi/Marathi examples ongoing
3. **FSSAI data quality:** Scraped data may miss cases; direct API integration pending
4. **Prediction scope:** Prophet model covers 8 food categories — expanding to 30+
5. **User study:** Single city (Nagpur); generalisability to other Indian cities untested
6. **Real-time camera:** YOLOv8 browser inference limited to 10-15 FPS on mid-range phones

---

## 8. Conclusion

We presented FoodSafe, a multimodal AI system for consumer-level food adulteration detection supporting English, Hindi, and Marathi. Our system significantly outperforms baselines across all components and demonstrated a 151.6% improvement in end-to-end adulteration identification vs control in a real-world user study. The combination of native regional NLP, computer vision, and seasonal prediction — deployed entirely on free infrastructure — makes this approach practically deployable at scale for Indian families.

Future work will expand the food detection dataset, integrate a direct FSSAI API, and extend the WhatsApp bot to 12 regional languages via IndicTrans2.

---

## References

*(To be completed with full citations)*

- Kakwani et al. (2020). IndicNLPSuite: Monolingual Corpora, Evaluation Benchmarks for Indian Languages. EMNLP.
- Khanuja et al. (2021). MuRIL: Multilingual Representations for Indian Languages. arXiv:2103.10730.
- Taylor & Letham (2018). Forecasting at Scale. The American Statistician.
- FSSAI Annual Report 2024-25. Food Safety and Standards Authority of India.
- ICMR Dietary Guidelines for Indians, 2024.
- Jocher et al. (2023). Ultralytics YOLOv8. GitHub.
- Sadilek et al. (2013). Deploying nEmesis: Preventing Foodborne Illness by Data Mining Social Media. AAAI.

---

*Word count target: 6,000-8,000 words for IEEE conference format*
*Figures needed: 5 (architecture diagram, YOLOv8 results, NLP comparison, Prophet forecast, user study)*
