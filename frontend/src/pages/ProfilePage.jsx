import { useState } from 'react'
import { ChevronRight, Plus, Trash2, User } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
]

const INITIAL_USER = {
  name: 'Atharva Vavhal',
  email: 'atharva@example.com',
}

const INITIAL_FAMILY = [
  { id: 'f1', name: 'Grandfather', conditions: ['Diabetes'] },
  { id: 'f2', name: 'Mom', conditions: ['Hypertension'] },
]

export default function ProfilePage() {
  const [lang, setLang] = useState('en')
  const [langOpen, setLangOpen] = useState(false)
  const [family, setFamily] = useState(INITIAL_FAMILY)
  const [addingMember, setAddingMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCondition, setNewCondition] = useState('')

  const currentLang = LANGUAGES.find((l) => l.code === lang)

  function addMember() {
    if (!newName.trim()) return
    setFamily((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        conditions: newCondition.trim() ? [newCondition.trim()] : [],
      },
    ])
    setNewName('')
    setNewCondition('')
    setAddingMember(false)
  }

  function removeMember(id) {
    setFamily((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="flex flex-col gap-8 px-5 pt-8 pb-4">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center
                        text-white text-xl font-semibold shrink-0">
          {INITIAL_USER.name.charAt(0)}
        </div>
        <div>
          <p className="text-lg font-semibold text-stone-900">{INITIAL_USER.name}</p>
          <p className="text-sm text-stone-500">{INITIAL_USER.email}</p>
        </div>
      </div>

      {/* Preferences */}
      <Section title="Preferences">
        {/* Language */}
        <SettingRow
          label="Language"
          value={currentLang.label}
          onClick={() => setLangOpen((v) => !v)}
        />
        {langOpen && (
          <div className="border-t border-stone-100 divide-y divide-stone-100">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setLangOpen(false) }}
                className="w-full flex items-center justify-between px-4 py-3
                           hover:bg-stone-50 text-left transition-colors"
              >
                <span className={`text-[15px] ${lang === l.code ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>
                  {l.label}
                </span>
                {lang === l.code && <span className="text-emerald-600 text-sm font-medium">✓</span>}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Family */}
      <Section title="Scanning For">
        <div className="divide-y divide-stone-100">
          {family.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center
                              text-sm font-medium text-stone-600 shrink-0">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-stone-900">{member.name}</p>
                {member.conditions.length > 0 && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {member.conditions.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeMember(member.id)}
                className="w-8 h-8 rounded-full hover:bg-red-50 text-stone-400 hover:text-red-500
                           flex items-center justify-center transition-colors"
                aria-label={`Remove ${member.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add member form */}
          {addingMember ? (
            <div className="px-4 py-4 flex flex-col gap-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="h-10 px-3 rounded-lg border border-stone-300 text-sm text-stone-900
                           placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Health condition (optional)"
                className="h-10 px-3 rounded-lg border border-stone-300 text-sm text-stone-900
                           placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={addMember}
                  className="flex-1 h-9 bg-stone-900 text-white text-sm font-medium rounded-lg"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingMember(false); setNewName(''); setNewCondition('') }}
                  className="flex-1 h-9 border border-stone-300 text-stone-700 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingMember(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                         hover:bg-stone-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-stone-300
                              flex items-center justify-center shrink-0">
                <Plus size={14} className="text-stone-400" />
              </div>
              <span className="text-sm font-medium text-stone-500">Add family member</span>
            </button>
          )}
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50
                           transition-colors text-left">
          <User size={16} className="text-stone-400" />
          <span className="flex-1 text-[15px] text-stone-700">Export my data</span>
          <ChevronRight size={16} className="text-stone-300" />
        </button>
        <div className="border-t border-stone-100">
          <button className="w-full px-4 py-3.5 text-[15px] font-medium text-red-600 text-left
                             hover:bg-red-50 transition-colors rounded-b-2xl">
            Log Out
          </button>
        </div>
      </Section>
    </div>
  )
}

// ─── Small reusable helpers ───────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2 px-1">
        {title}
      </p>
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5
                 hover:bg-stone-50 active:bg-stone-100 transition-colors text-left"
    >
      <span className="text-[15px] text-stone-700">{label}</span>
      <div className="flex items-center gap-1.5 text-stone-500">
        <span className="text-sm">{value}</span>
        <ChevronRight size={15} className="text-stone-300" />
      </div>
    </button>
  )
}
