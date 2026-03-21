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
        position: 'fixed', bottom: 80, right: 16, zIndex: 1000,
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
          position: 'fixed', bottom: 140, right: 16, zIndex: 1000,
          width: 300, height: 420, background: '#fff',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          border: '0.5px solid #e0e0d8', overflow: 'hidden',
        }}>
          <div style={{ background: '#1a3d2b', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAF3DE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌿</div>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>FoodSafe AI</div>
              <div style={{ color: '#a8c5a0', fontSize: 10 }}>Food safety assistant</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '7px 10px', borderRadius: 10,
                  fontSize: 12, lineHeight: 1.5,
                  background: m.role === 'user' ? '#1a3d2b' : '#f5f5f0',
                  color: m.role === 'user' ? '#fff' : '#333',
                  borderBottomRightRadius: m.role === 'user' ? 2 : 10,
                  borderBottomLeftRadius: m.role === 'assistant' ? 2 : 10,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '7px 12px', borderRadius: 10, background: '#f5f5f0', fontSize: 12, color: '#888' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div style={{ padding: '0 10px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 12,
                  border: '1px solid #ddd', background: '#f8f9f6',
                  cursor: 'pointer', color: '#1a3d2b',
                }}>{s}</button>
              ))}
            </div>
          )}

          <div style={{ padding: '8px 10px', borderTop: '0.5px solid #e0e0d8', display: 'flex', gap: 6 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={lang === 'hi' ? 'कुछ पूछें...' : lang === 'mr' ? 'विचारा...' : 'Ask anything...'}
              style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd',
                fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              background: loading || !input.trim() ? '#ccc' : '#1a3d2b',
              color: '#fff', fontSize: 12, cursor: 'pointer',
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
