'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [openaiSaveStatus, setOpenaiSaveStatus] = useState<SaveStatus>('idle')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')

  useEffect(() => {
    supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['webhook_url', 'openai_api_key'])
      .then(({ data }) => {
        if (!data) return
        const webhook = data.find(item => item.key === 'webhook_url')
        const openai = data.find(item => item.key === 'openai_api_key')
        if (webhook?.value) setWebhookUrl(webhook.value)
        if (openai?.value) setOpenaiKey(openai.value)
      })
  }, [])

  async function handleSave() {
    setSaveStatus('saving')
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'webhook_url', value: webhookUrl.trim() })
    setSaveStatus(error ? 'error' : 'saved')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  async function handleSaveOpenAI() {
    setOpenaiSaveStatus('saving')
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'openai_api_key', value: openaiKey.trim() })
    setOpenaiSaveStatus(error ? 'error' : 'saved')
    setTimeout(() => setOpenaiSaveStatus('idle'), 3000)
  }

  async function handleTest() {
    setTestStatus('testing')
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'todo.test',
          todo: {
            id: 'test-id',
            text: 'Tarea de prueba',
            completed: false,
            status: 'pendiente',
            created_at: new Date().toISOString(),
            description: null,
            start_date: null,
            due_date: null,
            end_date: null,
            estimated_time: null,
          },
          changes: null,
        }),
      })
      const json = await res.json()
      setTestStatus(json.ok ? 'ok' : 'error')
    } catch {
      setTestStatus('error')
    }
    setTimeout(() => setTestStatus('idle'), 4000)
  }

  return (
    <>
      <div className="dot-pattern" />
      <div className="app-container">
        <header className="app-header" style={{ position: 'relative' }}>
          <a
            href="/"
            style={{
              position: 'absolute', left: 0, top: 0,
              border: 'none', background: 'none',
              color: 'var(--claude-text-muted)', fontSize: '12px',
              fontFamily: 'inherit', fontWeight: 500,
              cursor: 'pointer', padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              transition: 'background var(--transition)',
            }}
            onMouseOver={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--claude-bg-warm)')}
            onMouseOut={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'none')}
          >
            ← Volver
          </a>
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#D97757"/>
              <path d="M11 16.5C11 16.5 13 19 16 19C19 19 21 16.5 21 16.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="13" r="1.5" fill="white"/>
              <circle cx="20" cy="13" r="1.5" fill="white"/>
            </svg>
            <h1>Configuración</h1>
          </div>
          <p className="subtitle">Ajustes de la aplicación</p>
        </header>

        <div style={{
          background: 'var(--claude-surface)',
          border: '1px solid var(--claude-border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          marginTop: '8px',
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--claude-text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L9.8 5.2L14.5 5.6L11.1 8.6L12.1 13.2L8 10.8L3.9 13.2L4.9 8.6L1.5 5.6L6.2 5.2L8 1Z" stroke="var(--claude-terracotta)" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Webhook
          </h2>

          <p style={{
            fontSize: '12px',
            color: 'var(--claude-text-muted)',
            marginBottom: '12px',
            lineHeight: '1.5',
          }}>
            Recibe notificaciones cuando se crean o actualizan tareas. Compatible con n8n, Make, Zapier y cualquier servicio que acepte POST.
          </p>

          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--claude-text-soft)',
            marginBottom: '6px',
          }}>
            URL del webhook
          </label>

          <input
            type="text"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--claude-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--claude-bg)',
              color: 'var(--claude-text)',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color var(--transition)',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--claude-terracotta)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--claude-border)')}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              style={{
                padding: '8px 16px',
                background: 'var(--claude-terracotta)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveStatus === 'saving' ? 0.7 : 1,
                transition: 'opacity var(--transition)',
              }}
            >
              {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
            </button>

            <button
              onClick={handleTest}
              disabled={testStatus === 'testing' || !webhookUrl.trim()}
              style={{
                padding: '8px 16px',
                background: 'none',
                color: 'var(--claude-text-soft)',
                border: '1px solid var(--claude-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: (testStatus === 'testing' || !webhookUrl.trim()) ? 'not-allowed' : 'pointer',
                opacity: (testStatus === 'testing' || !webhookUrl.trim()) ? 0.5 : 1,
                transition: 'background var(--transition)',
              }}
              onMouseOver={e => {
                if (testStatus !== 'testing' && webhookUrl.trim())
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--claude-bg-warm)'
              }}
              onMouseOut={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
            >
              {testStatus === 'testing' ? 'Probando...' : 'Probar'}
            </button>

            {saveStatus === 'saved' && (
              <span style={{ fontSize: '12px', color: '#4CAF7D', fontWeight: 500 }}>Guardado ✓</span>
            )}
            {saveStatus === 'error' && (
              <span style={{ fontSize: '12px', color: 'var(--claude-danger)', fontWeight: 500 }}>Error al guardar ✗</span>
            )}
            {testStatus === 'ok' && (
              <span style={{ fontSize: '12px', color: '#4CAF7D', fontWeight: 500 }}>Enviado ✓</span>
            )}
            {testStatus === 'error' && (
              <span style={{ fontSize: '12px', color: 'var(--claude-danger)', fontWeight: 500 }}>Sin respuesta ✗</span>
            )}
          </div>
        </div>

        <div style={{
          background: 'var(--claude-surface)',
          border: '1px solid var(--claude-border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          marginTop: '16px',
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--claude-text)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8C1.5 11.6 4.4 14.5 8 14.5C11.6 14.5 14.5 11.6 14.5 8C14.5 4.4 11.6 1.5 8 1.5Z" stroke="var(--claude-terracotta)" strokeWidth="1.3"/>
              <path d="M5.2 6.7C5.7 5.6 6.8 4.9 8.1 4.9C9.7 4.9 10.9 5.9 10.9 7.3C10.9 8.5 10.1 9.1 9.3 9.6C8.6 10 8.3 10.3 8.3 11" stroke="var(--claude-terracotta)" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="8.3" cy="12.5" r="0.8" fill="var(--claude-terracotta)"/>
            </svg>
            OpenAI API
          </h2>

          <p style={{
            fontSize: '12px',
            color: 'var(--claude-text-muted)',
            marginBottom: '12px',
            lineHeight: '1.5',
          }}>
            Se usa para generar subtareas automaticamente desde la descripcion.
          </p>

          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--claude-text-soft)',
            marginBottom: '6px',
          }}>
            API Key de OpenAI
          </label>

          <input
            type="password"
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--claude-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--claude-bg)',
              color: 'var(--claude-text)',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color var(--transition)',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--claude-terracotta)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--claude-border)')}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleSaveOpenAI}
              disabled={openaiSaveStatus === 'saving'}
              style={{
                padding: '8px 16px',
                background: 'var(--claude-terracotta)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: openaiSaveStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: openaiSaveStatus === 'saving' ? 0.7 : 1,
                transition: 'opacity var(--transition)',
              }}
            >
              {openaiSaveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
            </button>

            {openaiSaveStatus === 'saved' && (
              <span style={{ fontSize: '12px', color: '#4CAF7D', fontWeight: 500 }}>Guardado ✓</span>
            )}
            {openaiSaveStatus === 'error' && (
              <span style={{ fontSize: '12px', color: 'var(--claude-danger)', fontWeight: 500 }}>Error al guardar ✗</span>
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <span>Hecho con</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="#D97757">
          <path d="M7 12.5C7 12.5 1 9 1 5.5C1 3.5 2.5 2 4.5 2C5.8 2 6.8 2.7 7 3.5C7.2 2.7 8.2 2 9.5 2C11.5 2 13 3.5 13 5.5C13 9 7 12.5 7 12.5Z"/>
        </svg>
        <span>por Claude</span>
      </footer>
    </>
  )
}
