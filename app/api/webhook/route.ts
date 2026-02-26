import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Read webhook_url from app_config
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'webhook_url')
    .single()

  if (error || !data?.value) {
    return NextResponse.json({ ok: false, reason: 'no_url' })
  }

  const webhookUrl = data.value

  const payload = {
    event: body.event,
    timestamp: new Date().toISOString(),
    todo: body.todo,
    changes: body.changes ?? null,
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return NextResponse.json({ ok: true, status: res.status })
  } catch (err) {
    return NextResponse.json({ ok: false, reason: String(err) })
  }
}
