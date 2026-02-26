import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Todo = {
  id: string
  text: string
  completed: boolean
  created_at: string
  description: string | null
  status: 'pendiente' | 'planificado' | 'en_curso' | 'desestimado' | 'finalizado'
  start_date: string | null
  due_date: string | null
  end_date: string | null
  estimated_time: string | null
}

export type TodoAlert = {
  id: string
  todo_id: string
  title: string
  created_at: string
}

export type TodoDependency = {
  todo_id: string
  depends_on_id: string
}
