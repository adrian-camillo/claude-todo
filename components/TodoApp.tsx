'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, type Todo } from '@/lib/supabase'
import { logout } from '@/app/actions'
import TodoModal from './TodoModal'
import { notifyWebhook } from '@/lib/webhook'

type Filter = 'all' | 'active' | 'finished'

const STATUS_COLOR: Record<Todo['status'], string> = {
  pendiente:   '#A89888',
  planificado: '#5B8DD9',
  en_curso:    '#D9A557',
  desestimado: '#C0583A',
  finalizado:  '#4CAF7D',
}

const STATUS_LABEL: Record<Todo['status'], string> = {
  pendiente:   'Pendiente',
  planificado: 'Planificado',
  en_curso:    'En curso',
  desestimado: 'Desestimado',
  finalizado:  'Finalizado',
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [modalTodo, setModalTodo] = useState<Todo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchHandledRef = useRef(false)

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTodos(data as Todo[])
    setLoading(false)
  }

  async function addTodo() {
    const text = input.trim()
    if (!text) { inputRef.current?.focus(); return }

    const { data } = await supabase
      .from('todos')
      .insert({ text, completed: false, status: 'pendiente' })
      .select()
      .single()

    if (data) {
      setTodos(prev => [data as Todo, ...prev])
      notifyWebhook('todo.created', data as Todo)
    }
    setInput('')
    inputRef.current?.focus()
  }

  async function toggleTodo(id: string) {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const newCompleted = !todo.completed
    const newStatus: Todo['status'] = newCompleted ? 'finalizado' : 'pendiente'
    const updates: Partial<Todo> = {
      completed: newCompleted,
      status: newStatus,
      end_date: newCompleted ? (todo.end_date || new Date().toISOString().slice(0, 10)) : null,
    }
    const { data } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setTodos(prev => prev.map(t => t.id === id ? data as Todo : t))
      notifyWebhook('todo.updated', data as Todo, todo)
    }
  }

  function startRemove(id: string, callback: () => void) {
    setRemovingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      callback()
      setRemovingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }, 280)
  }

  async function deleteTodo(id: string) {
    startRemove(id, async () => {
      await supabase.from('todos').delete().eq('id', id)
      setTodos(prev => prev.filter(t => t.id !== id))
    })
  }

  function handleModalSave(updated: Todo) {
    setTodos(prev => prev.map(t => t.id === updated.id ? updated : t))
    setModalTodo(null)
  }

  async function clearFinished() {
    const finishedIds = todos.filter(t => t.status === 'finalizado').map(t => t.id)
    finishedIds.forEach(id => setRemovingIds(prev => new Set(prev).add(id)))
    setTimeout(async () => {
      await supabase.from('todos').delete().in('id', finishedIds)
      setTodos(prev => prev.filter(t => t.status !== 'finalizado'))
      setRemovingIds(prev => {
        const s = new Set(prev)
        finishedIds.forEach(id => s.delete(id))
        return s
      })
    }, 280)
  }

  const filtered = todos.filter(t => {
    if (filter === 'active')   return ['pendiente', 'planificado', 'en_curso'].includes(t.status)
    if (filter === 'finished') return t.status === 'finalizado'
    return true
  })

  const finishedCount = todos.filter(t => t.status === 'finalizado').length
  const activeCount   = todos.length - finishedCount

  const statsText = todos.length === 0
    ? '0 tareas'
    : `${activeCount} activa${activeCount !== 1 ? 's' : ''} de ${todos.length}`

  const filterLabels: Record<Filter, string> = {
    all:      'Todas',
    active:   'Activas',
    finished: 'Finalizadas',
  }

  const filterOrder: Filter[] = ['all', 'active', 'finished']

  function handleSwipeChange(direction: 'left' | 'right') {
    const currentIndex = filterOrder.indexOf(filter)
    if (currentIndex === -1) return
    const nextIndex = direction === 'left'
      ? Math.min(filterOrder.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1)
    if (nextIndex !== currentIndex) setFilter(filterOrder[nextIndex])
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    touchHandledRef.current = false
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!touchStartRef.current || touchHandledRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      handleSwipeChange(dx < 0 ? 'left' : 'right')
      touchHandledRef.current = true
    }
  }

  function formatDate(d: string | null) {
    if (!d) return null
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <>
      <div className="dot-pattern" />

      <div className="app-container">
        <header className="app-header" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <a
              href="/settings"
              title="Configuración"
              style={{
                border: 'none', background: 'none',
                color: 'var(--claude-text-muted)',
                cursor: 'pointer', padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                transition: 'background var(--transition)',
                display: 'inline-flex', alignItems: 'center',
                textDecoration: 'none',
              }}
              onMouseOver={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--claude-bg-warm)')}
              onMouseOut={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'none')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.9 2.9l1.1 1.1M12 12l1.1 1.1M2.9 13.1L4 12M12 4l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </a>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesión"
                style={{
                  border: 'none', background: 'none',
                  color: 'var(--claude-text-muted)', fontSize: '12px',
                  fontFamily: 'inherit', fontWeight: 500,
                  cursor: 'pointer', padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background var(--transition)',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--claude-bg-warm)')}
                onMouseOut={e => (e.currentTarget.style.background = 'none')}
              >
                Salir
              </button>
            </form>
          </div>
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#D97757"/>
              <path d="M11 16.5C11 16.5 13 19 16 19C19 19 21 16.5 21 16.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="13" r="1.5" fill="white"/>
              <circle cx="20" cy="13" r="1.5" fill="white"/>
            </svg>
            <h1>Claude Todo</h1>
          </div>
          <p className="subtitle">Organiza tus tareas con estilo</p>
        </header>

        <div className="input-section">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              className="todo-input"
              type="text"
              placeholder="Escribe una nueva tarea..."
              autoComplete="off"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
            />
            <button className="btn-add" onClick={addTodo} disabled={loading} title="Agregar tarea">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="filters" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {(['all', 'active', 'finished'] as Filter[]).map(f => (
            <button
              key={f}
              className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        <div className="stats-bar">
          <span className="stats-text">{statsText}</span>
          {finishedCount > 0 && (
            <button className="btn-clear" onClick={clearFinished}>
              Limpiar finalizadas
            </button>
          )}
        </div>

        <ul className="todo-list">
          {loading ? (
            <li className="empty-state">
              <p>Cargando...</p>
            </li>
          ) : filtered.length === 0 ? (
            <li className="empty-state">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#D97757" strokeWidth="2" strokeDasharray="4 4" opacity="0.4"/>
                <path d="M18 24L22 28L30 20" stroke="#D97757" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              </svg>
              <p>{todos.length === 0 ? 'No hay tareas todavía' : 'Sin resultados'}</p>
              <span>{todos.length === 0 ? 'Agrega una tarea para comenzar' : 'No hay tareas en esta categoría'}</span>
            </li>
          ) : (
            filtered.map(todo => (
              <li
                key={todo.id}
                className={`todo-item${todo.completed ? ' completed' : ''}${removingIds.has(todo.id) ? ' removing' : ''}`}
              >
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />

                <div className="todo-main" onClick={() => setModalTodo(todo)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                  <span className="todo-text">{todo.text}</span>
                  <div className="todo-meta">
                    <span
                      className="badge"
                      style={{ '--pill-color': STATUS_COLOR[todo.status] } as React.CSSProperties}
                    >
                      {STATUS_LABEL[todo.status]}
                    </span>
                    {todo.due_date && (
                      <span className="todo-due-date">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ verticalAlign: 'middle' }}>
                          <rect x="1" y="2" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        {' '}{formatDate(todo.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="todo-actions">
                  <button
                    className="btn-action btn-edit"
                    title="Editar"
                    onClick={() => setModalTodo(todo)}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M8.5 2.5L11.5 5.5M1.5 12.5L2.2 9.6L10 1.8C10.4 1.4 11.1 1.4 11.5 1.8L12.2 2.5C12.6 2.9 12.6 3.6 12.2 4L4.4 11.8L1.5 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="btn-action btn-delete" title="Eliminar" onClick={() => deleteTodo(todo.id)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 4H11.5M5 4V2.5C5 2.2 5.2 2 5.5 2H8.5C8.8 2 9 2.2 9 2.5V4M5.5 6.5V10.5M8.5 6.5V10.5M3.5 4L4 11.5C4 11.8 4.2 12 4.5 12H9.5C9.8 12 10 11.8 10 11.5L10.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <footer className="app-footer">
        <span>Hecho con</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="#D97757">
          <path d="M7 12.5C7 12.5 1 9 1 5.5C1 3.5 2.5 2 4.5 2C5.8 2 6.8 2.7 7 3.5C7.2 2.7 8.2 2 9.5 2C11.5 2 13 3.5 13 5.5C13 9 7 12.5 7 12.5Z"/>
        </svg>
        <span>por Claude</span>
      </footer>

      {modalTodo && (
        <TodoModal
          todo={modalTodo}
          allTodos={todos}
          onClose={() => setModalTodo(null)}
          onSave={handleModalSave}
        />
      )}
    </>
  )
}
