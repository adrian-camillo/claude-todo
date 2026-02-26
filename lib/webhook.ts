import { type Todo } from './supabase'

type WebhookEvent = 'todo.created' | 'todo.updated' | 'todo.test'

type FieldChange = { from: unknown; to: unknown }

const TRACKED_FIELDS: (keyof Todo)[] = [
  'text',
  'status',
  'completed',
  'description',
  'start_date',
  'due_date',
  'end_date',
  'estimated_time',
]

function calcChanges(prev: Todo, next: Todo): Record<string, FieldChange> | null {
  const changes: Record<string, FieldChange> = {}
  for (const field of TRACKED_FIELDS) {
    if (prev[field] !== next[field]) {
      changes[field] = { from: prev[field], to: next[field] }
    }
  }
  return Object.keys(changes).length > 0 ? changes : null
}

export function notifyWebhook(
  event: WebhookEvent,
  todo: Todo,
  previousTodo?: Todo
): void {
  const changes = (event === 'todo.updated' && previousTodo)
    ? calcChanges(previousTodo, todo)
    : null

  fetch('/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, todo, changes }),
  }).catch(() => {
    // fire-and-forget: ignore errors silently
  })
}
