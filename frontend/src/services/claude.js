// Claude API service — all AI calls go through here
// Uses Anthropic API directly from frontend for the Artifact demo
// In production: route through FastAPI backend

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

async function callClaude(messages, systemPrompt, maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  })
  const data = await res.json()
  const text = data.content?.find(b => b.type === 'text')?.text || ''
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { error: 'Parse failed', raw: text }
  }
}

// ── Food adulteration scan ────────────────────────────────
export async function scanFood({ foodName, memberProfile, lang = 'en' }) {
  const system = `You are a food safety expert specializing in Indian food adulteration. 
Respond ONLY with valid JSON, no markdown. Language: ${lang}.
${memberProfile ? `User health profile: ${JSON.stringify(memberProfile)}` : ''}`

  const prompt = `Analyze food adulteration for: "${foodName}"

Return this exact JSON:
{
  "foodName": "cleaned name",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "safetyScore": 0-100,
  "summary": "2 sentence overview",
  "cookingWarning": "null or heating risk warning",
  "personalizedWarning": "null or warning specific to health profile",
  "adulterants": [
    {
      "name": "adulterant name",
      "description": "what it is, why added",
      "healthRisk": "specific health impact",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "isPersonalRisk": true/false
    }
  ],
  "homeTests": [
    {
      "name": "test name",
      "steps": "step by step",
      "result": "what positive/negative looks like",
      "difficulty": "Easy|Medium|Hard"
    }
  ],
  "buyingTips": ["tip1", "tip2", "tip3"],
  "verdict": "one punchy verdict sentence"
}`

  return callClaude([{ role: 'user', content: prompt }], system)
}

// ── Combination risk analysis ─────────────────────────────
export async function scanCombination({ foods, memberProfile, lang = 'en' }) {
  const system = `You are a food safety and toxicology expert. Respond ONLY with valid JSON.`

  const prompt = `Analyze combined adulteration risk for these foods eaten together: ${foods.join(', ')}
${memberProfile ? `Health profile: ${JSON.stringify(memberProfile)}` : ''}

Return JSON:
{
  "combinedRiskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "combinedScore": 0-100,
  "interactions": [
    { "foods": ["food1", "food2"], "interaction": "what happens", "severity": "LOW|MEDIUM|HIGH" }
  ],
  "dailyExposureWarning": "cumulative toxin exposure note",
  "recommendation": "what to do"
}`

  return callClaude([{ role: 'user', content: prompt }], system)
}

// ── Symptom reverse lookup ────────────────────────────────
export async function analyzeSymptoms({ symptoms, recentFoods, lang = 'en' }) {
  const system = `You are a food safety and public health expert. Respond ONLY with valid JSON.`

  const prompt = `Symptoms reported: "${symptoms}"
Recent foods consumed: ${recentFoods?.join(', ') || 'unknown'}

Analyze if these could be related to food adulteration. Return JSON:
{
  "possibleCauses": [
    { "adulterant": "name", "food": "likely food", "confidence": "HIGH|MEDIUM|LOW", "explanation": "why" }
  ],
  "urgency": "MONITOR|CONSULT_DOCTOR|EMERGENCY",
  "recommendation": "what to do now",
  "disclaimer": "always include medical disclaimer"
}`

  return callClaude([{ role: 'user', content: prompt }], system)
}

// ── Image label analysis ──────────────────────────────────
export async function analyzeLabel({ imageBase64, lang = 'en' }) {
  const system = `You are a food label and ingredient safety expert. Respond ONLY with valid JSON.`

  const messages = [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
      },
      {
        type: 'text',
        text: `Analyze this food label/ingredient list for safety concerns. Return JSON:
{
  "productName": "detected product name",
  "flaggedIngredients": [
    { "ingredient": "name", "concern": "what the issue is", "severity": "LOW|MEDIUM|HIGH" }
  ],
  "eNumbers": [ { "code": "E-number", "name": "full name", "risk": "LOW|MEDIUM|HIGH", "note": "brief note" } ],
  "overallRisk": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "overall assessment"
}`
      }
    ]
  }]

  return callClaude(messages, system, 1500)
}
