'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, type Todo, type TodoAlert } from '@/lib/supabase'
import { notifyWebhook } from '@/lib/webhook'

type TodoModalProps = {
  todo: Todo
  allTodos: Todo[]
  onClose: () => void
  onSave: (updated: Todo) => void
}

const STATUS_OPTIONS: { value: Todo['status']; label: string; color: string }[] = [
  { value: 'pendiente',   label: 'Pendiente',   color: '#A89888' },
  { value: 'planificado', label: 'Planificado',  color: '#5B8DD9' },
  { value: 'en_curso',    label: 'En curso',     color: '#D9A557' },
  { value: 'desestimado', label: 'Desestimado',  color: '#C0583A' },
  { value: 'finalizado',  label: 'Finalizado',   color: '#4CAF7D' },
]

export default function TodoModal({ todo, allTodos, onClose, onSave }: TodoModalProps) {
  const [text, setText] = useState(todo.text)
  const [description, setDescription] = useState(todo.description ?? '')
  const [status, setStatus] = useState<Todo['status']>(todo.status)
  const [startDate, setStartDate] = useState(todo.start_date ?? '')
  const [dueDate, setDueDate] = useState(todo.due_date ?? '')
  const [endDate, setEndDate] = useState(todo.end_date ?? '')
  const [estimatedTime, setEstimatedTime] = useState(todo.estimated_time ?? '')
  const [alerts, setAlerts] = useState<{ id: string; title: string; isNew?: boolean }[]>([])
  const [dependencies, setDependencies] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Load alerts and dependencies
  useEffect(() => {
    async function load() {
      const [alertsRes, depsRes] = await Promise.all([
        supabase.from('todo_alerts').select('*').eq('todo_id', todo.id).order('created_at'),
        supabase.from('todo_dependencies').select('depends_on_id').eq('todo_id', todo.id),
      ])
      if (alertsRes.data) setAlerts(alertsRes.data)
      if (depsRes.data) setDependencies(depsRes.data.map((d: { depends_on_id: string }) => d.depends_on_id))
    }
    load()
  }, [todo.id])

  function handleStatusChange(newStatus: Todo['status']) {
    setStatus(newStatus)
    if (newStatus === 'finalizado') {
      if (!endDate) setEndDate(new Date().toISOString().slice(0, 10))
    }
  }

  function handleDueDateChange(val: string) {
    setDueDate(val)
    if (val && status === 'pendiente') {
      setStatus('planificado')
    }
  }

  function addAlert() {
    setAlerts(prev => [...prev, { id: crypto.randomUUID(), title: '', isNew: true }])
  }

  function updateAlertTitle(id: string, title: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, title } : a))
  }

  function removeAlert(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  function toggleDependency(id: string) {
    setDependencies(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)

    const isFinished = status === 'finalizado'
    const completed = isFinished

    // Update todo
    const { data: updatedTodo, error } = await supabase
      .from('todos')
      .update({
        text: text.trim(),
        description: description || null,
        status,
        completed,
        start_date: startDate || null,
        due_date: dueDate || null,
        end_date: isFinished ? (endDate || new Date().toISOString().slice(0, 10)) : (endDate || null),
        estimated_time: estimatedTime || null,
      })
      .eq('id', todo.id)
      .select()
      .single()

    if (error || !updatedTodo) { setSaving(false); return }

    // Sync alerts: delete all then re-insert remaining ones with titles
    await supabase.from('todo_alerts').delete().eq('todo_id', todo.id)
    const validAlerts = alerts.filter(a => a.title.trim())
    if (validAlerts.length > 0) {
      await supabase.from('todo_alerts').insert(
        validAlerts.map(a => ({ todo_id: todo.id, title: a.title.trim() }))
      )
    }

    // Sync dependencies: delete all then re-insert
    await supabase.from('todo_dependencies').delete().eq('todo_id', todo.id)
    if (dependencies.length > 0) {
      await supabase.from('todo_dependencies').insert(
        dependencies.map(dep => ({ todo_id: todo.id, depends_on_id: dep }))
      )
    }

    setSaving(false)
    notifyWebhook('todo.updated', updatedTodo as Todo, todo)
    onSave(updatedTodo as Todo)
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  const otherTodos = allTodos.filter(t => t.id !== todo.id)

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <input
            className="modal-title-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Título de la tarea"
          />
          <button className="modal-close" onClick={onClose} title="Cerrar">×</button>
        </div>

        <div className="modal-body">
          {/* Description */}
          <div className="modal-section">
            <label className="modal-label">Descripción</label>
            <textarea
              className="modal-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Agrega una descripción..."
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="modal-section">
            <label className="modal-label">Estado</label>
            <div className="status-pills">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`status-pill${status === opt.value ? ' active' : ''}`}
                  style={{ '--pill-color': opt.color } as React.CSSProperties}
                  onClick={() => handleStatusChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="modal-section">
            <label className="modal-label">Fechas</label>
            <div className="dates-row">
              <div className="date-field">
                <span className="date-label">Inicio</span>
                <input
                  type="date"
                  className="modal-date-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="date-field">
                <span className="date-label">Entrega</span>
                <input
                  type="date"
                  className="modal-date-input"
                  value={dueDate}
                  onChange={e => handleDueDateChange(e.target.value)}
                />
              </div>
              <div className="date-field">
                <span className="date-label">Fin</span>
                <input
                  type="date"
                  className="modal-date-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Estimated time */}
          <div className="modal-section">
            <label className="modal-label">Tiempo estimado</label>
            <input
              type="text"
              className="modal-input"
              value={estimatedTime}
              onChange={e => setEstimatedTime(e.target.value)}
              placeholder="Ej: 2 horas, 3 días..."
            />
          </div>

          {/* Alerts */}
          <div className="modal-section">
            <div className="modal-section-header">
              <label className="modal-label">Alertas</label>
              <button className="btn-add-small" onClick={addAlert}>+ Agregar alerta</button>
            </div>
            {alerts.length === 0 && (
              <p className="modal-empty-hint">Sin alertas configuradas</p>
            )}
            {alerts.map(alert => (
              <div key={alert.id} className="alert-row">
                <input
                  type="text"
                  className="modal-input"
                  value={alert.title}
                  onChange={e => updateAlertTitle(alert.id, e.target.value)}
                  placeholder="Título de la alerta"
                  autoFocus={alert.isNew}
                />
                <button className="btn-remove-alert" onClick={() => removeAlert(alert.id)} title="Eliminar">×</button>
              </div>
            ))}
          </div>

          {/* Dependencies */}
          {otherTodos.length > 0 && (
            <div className="modal-section">
              <label className="modal-label">Depende de</label>
              <div className="dep-list">
                {otherTodos.map(t => (
                  <label key={t.id} className="dep-item">
                    <input
                      type="checkbox"
                      checked={dependencies.includes(t.id)}
                      onChange={() => toggleDependency(t.id)}
                    />
                    <span className={t.completed ? 'dep-text completed' : 'dep-text'}>{t.text}</span>
                    {t.status !== 'pendiente' && (
                      <span
                        className="badge"
                        style={{ '--pill-color': STATUS_OPTIONS.find(s => s.value === t.status)?.color } as React.CSSProperties}
                      >
                        {STATUS_OPTIONS.find(s => s.value === t.status)?.label}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save-modal" onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
