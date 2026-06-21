'use client'

import { useState, useEffect } from 'react'
import SettingsField from '@/components/admin/SettingsField'

export default function AiSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConfig(d.config?.ai || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/config?namespace=ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'AI settings saved!' })
      } else {
        const d = await res.json()
        setMsg({ type: 'error', text: d.error || 'Failed to save' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const provider = config.provider || 'gemini'

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>🤖 AI / Chatbot</h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Configure the AI provider powering the concierge chatbot
      </p>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: msg.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: 13, fontWeight: 500,
        }}>
          {msg.text}
        </div>
      )}

      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <SettingsField
          label="AI Provider"
          fieldKey="provider"
          type="select"
          value={provider}
          onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
          options={[
            { label: 'Google Gemini', value: 'gemini' },
            { label: 'OpenAI', value: 'openai' },
            { label: 'Ollama (Local)', value: 'ollama' },
          ]}
          hint="Which AI service powers the chatbot"
        />

        {/* Gemini — shown only when gemini selected */}
        {provider === 'gemini' && (
          <SettingsField
            label="Gemini API Key"
            fieldKey="geminiApiKey"
            type="password"
            value={config.geminiApiKey || ''}
            onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
            placeholder="AIza..."
            hint="Get from https://aistudio.google.com/app/apikey"
          />
        )}

        {/* OpenAI — shown only when openai selected */}
        {provider === 'openai' && (
          <SettingsField
            label="OpenAI API Key"
            fieldKey="openaiApiKey"
            type="password"
            value={config.openaiApiKey || ''}
            onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
            placeholder="sk-..."
            hint="Get from https://platform.openai.com/api-keys"
          />
        )}

        {/* Ollama — shown only when ollama selected */}
        {provider === 'ollama' && (
          <>
            <SettingsField
              label="Ollama Base URL"
              fieldKey="ollamaBaseUrl"
              type="text"
              value={config.ollamaBaseUrl || 'http://localhost:11434'}
              onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
              placeholder="http://localhost:11434"
              hint="URL of your Ollama server"
            />
            <SettingsField
              label="Ollama Model"
              fieldKey="ollamaModel"
              type="text"
              value={config.ollamaModel || 'qwen3:4b'}
              onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
              placeholder="qwen3:4b"
              hint="Model name (e.g. qwen3:4b, llama3:8b)"
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '12px 28px', background: '#151a17', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
