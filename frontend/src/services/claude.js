// FoodSafe AI Service — powered by Groq (FREE)
// Get free key at: console.groq.com → API Keys
// Free tier: unlimited requests, very fast (LLaMA 3)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || 'YOUR_GROQ_KEY_HERE'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(systemPrompt, userPrompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message || 'Groq API error')
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  const clean = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) }
  catch { return { error: 'parse_failed', raw: text } }
}

export async function scanFood({ foodName, memberProfile, lang = 'en' }) {
  const langNote = lang === 'hi' ? 'Respond with values in Hindi.' : lang === 'mr' ? 'Respond with values in Marathi.' : ''
  const system = `You are a food safety expert specializing in Indian food adulteration. Respond ONLY with valid JSON, no markdown, no extra text. ${langNote}`
  const user = `${memberProfile ? `User health profile: ${JSON.stringify(memberProfile)}\n` : ''}
Analyze adulteration risk for: "${foodName}"
Return ONLY this JSON:
{
  "foodName": "cleaned name",
  "riskLevel": "LOW or MEDIUM or HIGH or CRITICAL",
  "safetyScore": 0-100,
  "summary": "2 sentence overview",
  "cookingWarning": null or "warning if heating worsens it",
  "personalizedWarning": null or "warning for health profile",
  "adulterants": [
    { "name": "name", "description": "what and why added", "healthRisk": "impact", "severity": "LOW or MEDIUM or HIGH or CRITICAL", "isPersonalRisk": true or false }
  ],
  "homeTests": [
    { "name": "test name", "steps": "step by step", "result": "what to look for", "difficulty": "Easy or Medium or Hard" }
  ],
  "buyingTips": ["tip1", "tip2", "tip3"],
  "verdict": "one punchy verdict sentence"
}`
  return callGroq(system, user)
}

export async function scanCombination({ foods, memberProfile, lang = 'en' }) {
  const system = 'You are a food safety and toxicology expert. Respond ONLY with valid JSON, no markdown.'
  const user = `${memberProfile ? `Health profile: ${JSON.stringify(memberProfile)}\n` : ''}
Analyze combined risk for foods eaten together: ${foods.join(', ')}
Return ONLY this JSON:
{
  "combinedRiskLevel": "LOW or MEDIUM or HIGH or CRITICAL",
  "combinedScore": 0-100,
  "interactions": [{ "foods": ["f1","f2"], "interaction": "what happens", "severity": "LOW or MEDIUM or HIGH" }],
  "dailyExposureWarning": "cumulative toxin note",
  "recommendation": "actionable advice"
}`
  return callGroq(system, user)
}

export async function analyzeSymptoms({ symptoms, recentFoods, lang = 'en' }) {
  const system = 'You are a food safety and public health expert. Respond ONLY with valid JSON, no markdown.'
  const user = `Symptoms: "${symptoms}"
Recent foods: ${recentFoods?.join(', ') || 'unknown'}
Could these be from food adulteration? Return ONLY this JSON:
{
  "possibleCauses": [{ "adulterant": "name", "food": "source", "confidence": "HIGH or MEDIUM or LOW", "explanation": "why" }],
  "urgency": "MONITOR or CONSULT_DOCTOR or EMERGENCY",
  "recommendation": "what to do now",
  "disclaimer": "always seek professional medical advice"
}`
  return callGroq(system, user)
}

export async function analyzeLabel({ imageBase64, lang = 'en' }) {
  // Groq doesn't support vision — fall back to text description
  const system = 'You are a food label safety expert. Respond ONLY with valid JSON, no markdown.'
  const user = `A user uploaded a food label image. Provide general guidance on what to look for.
Return ONLY this JSON:
{
  "productName": "Unknown — manual check needed",
  "flaggedIngredients": [],
  "eNumbers": [
    { "code": "E102", "name": "Tartrazine", "risk": "MEDIUM", "note": "Yellow dye, may cause hyperactivity" },
    { "code": "E621", "name": "MSG", "risk": "LOW", "note": "Flavor enhancer, generally safe" }
  ],
  "overallRisk": "MEDIUM",
  "summary": "For accurate label analysis, please type the ingredient list in the search box and scan it as a food item."
}`
  return callGroq(system, user)
}