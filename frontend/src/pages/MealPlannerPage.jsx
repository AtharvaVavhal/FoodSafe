// frontend/src/pages/MealPlannerPage.jsx
import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'

const API_URL = '/api'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; }

  .mp-root { font-family:'DM Sans',sans-serif; background:#f7f5f0; min-height:100vh; display:flex; flex-direction:column; padding-bottom:80px; }

  .mp-header {
    background: linear-gradient(160deg, #0d2818, #1a3d2b);
    padding: 20px 16px 32px;
    position: relative;
    overflow: hidden;
  }
  .mp-header::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .mp-header::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 20px;
    background: #f7f5f0;
    border-radius: 20px 20px 0 0;
  }
  .mp-header-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 600;
    color: #f5f0e8;
    margin-bottom: 2px;
  }
  .mp-header-sub {
    font-size: 11px;
    color: rgba(245,240,232,0.45);
    font-weight: 300;
    letter-spacing: 0.04em;
    margin-bottom: 16px;
  }
  .mp-member-info {
    font-size: 11px;
    color: rgba(245,240,232,0.55);
    margin-bottom: 12px;
    font-weight: 300;
  }
  .mp-type-row { display:flex; gap:8px; }
  .mp-type-btn {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.08);
    color: rgba(245,240,232,0.7);
    font-size: 12px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }
  .mp-type-btn.active {
    background: rgba(201,168,76,0.25);
    border-color: rgba(201,168,76,0.5);
    color: #c9a84c;
  }

  .mp-body { padding: 14px 16px; flex: 1; }

  .mp-generate-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #c9a84c, #e0c068);
    color: #0d2818;
    font-size: 14px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(201,168,76,0.3);
    transition: transform 0.1s, opacity 0.15s;
    margin-bottom: 14px;
  }
  .mp-generate-btn:disabled { background:#ddd; color:#999; box-shadow:none; cursor:not-allowed; }
  .mp-generate-btn:not(:disabled):active { transform: scale(0.98); }

  .mp-section-label {
    font-size: 9px; font-weight: 600; letter-spacing: .12em;
    text-transform: uppercase; color: #999;
    margin-bottom: 6px; margin-left: 2px;
  }
  .mp-card {
    background: #fff; border-radius: 14px; border: 1px solid #ece8df;
    overflow: hidden; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .mp-meal-header {
    padding: 10px 14px; background: #f9f7f3;
    border-bottom: 1px solid #ece8df;
    display: flex; justify-content: space-between; align-items: center;
  }
  .mp-meal-type { font-size:9px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#aaa; }
  .mp-meal-name { font-size:13px; font-weight:600; color:#1a3d2b; font-family:'Playfair Display',serif; }
  .mp-prep-time { font-size:10px; color:#c9a84c; font-weight:500; }
  .mp-meal-body { padding: 10px 14px; }
  .mp-items { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:7px; }
  .mp-item-chip {
    font-size:11px; background:#eaf3de; color:#27500A;
    padding:3px 9px; border-radius:12px; font-weight:500; border:1px solid #c0dd97;
  }
  .mp-safety-note {
    font-size:10px; color:#639922; background:#f4fae8;
    padding:5px 9px; border-radius:7px; border:1px solid #c0dd97;
  }
  .mp-day-header {
    padding:10px 14px 6px; font-family:'Playfair Display',serif;
    font-size:15px; font-weight:600; color:#1a3d2b; border-bottom:1px solid #f4f1eb;
  }
  .mp-day-meal-row {
    padding:8px 14px; border-bottom:1px solid #f4f1eb;
    display:flex; gap:10px; align-items:flex-start;
  }
  .mp-day-meal-row:last-child { border-bottom:none; }
  .mp-day-meal-type {
    font-size:9px; font-weight:600; color:#aaa; text-transform:uppercase;
    letter-spacing:.08em; width:52px; flex-shrink:0; padding-top:1px;
  }
  .mp-day-meal-info { flex:1; }
  .mp-day-meal-name { font-size:12px; font-weight:600; color:#1a3d2b; margin-bottom:3px; }
  .mp-day-items { display:flex; flex-wrap:wrap; gap:4px; }
  .mp-day-item { font-size:10px; color:#666; background:#f5f1eb; padding:2px 7px; border-radius:8px; }
  .mp-tip-row {
    display:flex; gap:8px; align-items:flex-start;
    font-size:11px; color:#444; padding:6px 14px; border-bottom:1px solid #f4f1eb;
  }
  .mp-tip-row:last-child { border-bottom:none; }
  .mp-tip-arrow { color:#c9a84c; font-weight:700; flex-shrink:0; }
  .mp-avoided {
    font-size:11px; color:#791F1F; background:#fff0f0;
    padding:8px 12px; border-radius:10px; border:1px solid #f7c1c1; margin-bottom:10px;
  }
  .mp-loading { text-align:center; padding:40px 16px; color:#aaa; font-size:13px; font-weight:300; line-height:1.8; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .mp-fade { animation: fadeUp 0.3s ease forwards; }
`

const MEAL_ICONS = {
  breakfast: '🌅', morning_snack: '🍎',
  lunch: '🍱', evening_snack: '☕', dinner: '🌙', snack: '🍎',
}
const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner']

export default function MealPlannerPage() {
  const { scanHistory, activeMember, lang } = useStore()
  const [planType, setPlanType] = useState('single')
  const [plan, setPlan]         = useState(null)
  const [loading, setLoading]   = useState(false)

  const highRiskFoods = [...new Set(
    scanHistory
      .filter(s => ['HIGH', 'CRITICAL'].includes(s.risk_level))
      .map(s => s.food_name)
  )].slice(0, 8)

  async function generate() {
    setLoading(true)
    setPlan(null)
    try {
      const res = await fetch(`${API_URL}/meal-planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: planType,
          member_profile: activeMember || null,
          high_risk_foods: highRiskFoods,
          lang,
        }),
      })
      const data = await res.json()
      setPlan(data)
    } catch {
      setPlan({ error: 'Failed to generate. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mp-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="mp-header">
        <div className="mp-header-title">🥗 {t(lang, 'mealPlanner')}</div>
        <div className="mp-header-sub">{t(lang, 'mealPlannerSub')}</div>

        {activeMember && (
          <div className="mp-member-info">
            ⚕ {t(lang, 'personalizingFor')} {activeMember.name}
            {activeMember.conditions?.length > 0 && ` (${activeMember.conditions.join(', ')})`}
          </div>
        )}

        <div className="mp-type-row">
          <button
            className={`mp-type-btn${planType === 'single' ? ' active' : ''}`}
            onClick={() => { setPlanType('single'); setPlan(null) }}
          >
            📅 {t(lang, 'todaysPlan')}
          </button>
          <button
            className={`mp-type-btn${planType === 'weekly' ? ' active' : ''}`}
            onClick={() => { setPlanType('weekly'); setPlan(null) }}
          >
            🗓 {t(lang, 'weeklyPlan')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mp-body">
        <button className="mp-generate-btn" onClick={generate} disabled={loading}>
          {loading ? `⏳ ${t(lang, 'generatingPlan')}` : `✨ ${t(lang, 'generatePlan')}`}
        </button>

        {highRiskFoods.length > 0 && !loading && (
          <div className="mp-avoided">
            ⚠ {t(lang, 'avoidingFoods')}: {highRiskFoods.join(', ')}
          </div>
        )}

        {loading && (
          <div className="mp-loading">
            🤖 {t(lang, 'creatingPlan')}<br />
            <span style={{ fontSize: 10 }}>{t(lang, 'takesSeconds')}</span>
          </div>
        )}

        {plan?.error && (
          <div style={{ fontSize:12, color:'#A32D2D', background:'#fff0f0', padding:'10px 12px', borderRadius:10, border:'1px solid #f7c1c1' }}>
            {plan.error}
          </div>
        )}

        {/* Single day */}
        {plan && !plan.error && plan.plan_type === 'single' && (
          <div className="mp-fade">
            {MEAL_ORDER.map(mealKey => {
              const meal = plan[mealKey]
              if (!meal) return null
              return (
                <div key={mealKey}>
                  <div className="mp-section-label" style={{ marginTop: mealKey !== 'breakfast' ? 4 : 0 }}>
                    {MEAL_ICONS[mealKey]} {mealKey.replace('_', ' ')}
                  </div>
                  <div className="mp-card">
                    <div className="mp-meal-header">
                      <div>
                        <div className="mp-meal-type">{mealKey.replace('_', ' ')}</div>
                        <div className="mp-meal-name">{meal.name}</div>
                      </div>
                      {meal.prep_time && <div className="mp-prep-time">⏱ {meal.prep_time}</div>}
                    </div>
                    <div className="mp-meal-body">
                      <div className="mp-items">
                        {(meal.items || []).map((item, i) => (
                          <span key={i} className="mp-item-chip">{item}</span>
                        ))}
                      </div>
                      {meal.safety_note && (
                        <div className="mp-safety-note">✓ {meal.safety_note}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {plan.nutrition_summary && (
              <>
                <div className="mp-section-label" style={{ marginTop: 4 }}>{t(lang, 'nutritionSummary')}</div>
                <div style={{ fontSize:12, color:'#555', background:'#fff', padding:'10px 14px', borderRadius:12, border:'1px solid #ece8df', marginBottom:10 }}>
                  {plan.nutrition_summary}
                </div>
              </>
            )}

            {plan.safety_tips?.length > 0 && (
              <>
                <div className="mp-section-label">{t(lang, 'safetyTips')}</div>
                <div className="mp-card">
                  {plan.safety_tips.map((tip, i) => (
                    <div key={i} className="mp-tip-row">
                      <span className="mp-tip-arrow">→</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Weekly */}
        {plan && !plan.error && plan.plan_type === 'weekly' && (
          <div className="mp-fade">
            {(plan.days || []).map((day, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="mp-section-label">{day.day}</div>
                <div className="mp-card">
                  <div className="mp-day-header">{day.day}</div>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(mealKey => {
                    const meal = day[mealKey]
                    if (!meal) return null
                    return (
                      <div key={mealKey} className="mp-day-meal-row">
                        <div className="mp-day-meal-type">
                          {MEAL_ICONS[mealKey] || '🍽'} {mealKey}
                        </div>
                        <div className="mp-day-meal-info">
                          <div className="mp-day-meal-name">{meal.name || meal}</div>
                          <div className="mp-day-items">
                            {(meal.items || []).map((item, j) => (
                              <span key={j} className="mp-day-item">{item}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {plan.safety_tips?.length > 0 && (
              <>
                <div className="mp-section-label">{t(lang, 'safetyTips')}</div>
                <div className="mp-card">
                  {plan.safety_tips.map((tip, i) => (
                    <div key={i} className="mp-tip-row">
                      <span className="mp-tip-arrow">→</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
