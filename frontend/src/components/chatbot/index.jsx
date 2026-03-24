import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are FoodSafe AI, a food safety assistant for Indian families. You help with food adulteration detection, FSSAI violations, safe food buying tips, home tests, and seasonal food risks in Maharashtra. Keep responses short and practical. If asked in Hindi or Marathi, respond in the same language.`

const SUGGESTIONS = {
  en: ['Is turmeric safe?', 'How to test milk?', 'Safe oil brands?'],
  hi: ['हल्दी सुरक्षित है?', 'दूध कैसे जांचें?', 'त्योहार में क्या खाएं?'],
  mr: ['हळद सुरक्षित आहे?', 'दूध कसे तपासावे?', 'सणात काय खावे?'],
}

export default function Chatbot() {
  const { lang } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am FoodSafe AI. Ask me anything about food safety! 🌿' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const userMsg = text || input.trim()
    if (!userMsg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: userMsg }],
          temperature: 0.5,
          max_tokens: 300,
        })
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not respond.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: 80, right: 'max(16px, calc(50vw - 224px))', zIndex: 1000,
        width: 48, height: 48, borderRadius: '50%',
        background: '#1a3d2b', border: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        cursor: 'pointer', fontSize: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 140, right: 'max(16px, calc(50vw - 224px))', zIndex: 1000,
          width: 300, height: 420, background: '#dcdada',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          border: '0.5px solid #e0e0d8', overflow: 'hidden',
        }}>
          <div style={{ background: '#00a674', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌿</div>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>FoodSafe AI</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safety Assistant</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: '#080c11' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
                  fontSize: 13, lineHeight: 1.5,
                  background: m.role === 'user' ? '#00e09c' : '#1f252b',
                  color: m.role === 'user' ? '#04090e' : '#fff',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontWeight: 500
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '8px 14px', borderRadius: 16, background: '#1f252b', border: '1px solid rgba(255,255,255,0.05)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div style={{ padding: '4px 10px 10px', display: 'flex', gap: 6, flexWrap: 'wrap', background: '#080c11' }}>
              {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  fontSize: 10, padding: '5px 10px', borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontWeight: 600,
                  transition: 'all 0.2s'
                }}>{s}</button>
              ))}
            </div>
          )}

          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, background: '#0f141a' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={lang === 'hi' ? 'कुछ पूछें...' : lang === 'mr' ? 'विचारा...' : 'Ask anything...'}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#fff',
                background: '#171c22',
              }}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
              width: 38, height: 38, borderRadius: 12, border: 'none',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : '#00e09c',
              color: loading || !input.trim() ? 'rgba(255,255,255,0.2)' : '#04090e', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}