import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MODEL = 'gpt-4o-mini'

type OpenAIJson = {
  subtasks?: string[]
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const description = String(body?.description ?? '').trim()
  const title = String(body?.title ?? '').trim()

  if (!description) {
    return NextResponse.json({ ok: false, reason: 'no_description' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'openai_api_key')
    .single()

  if (error || !data?.value) {
    return NextResponse.json({ ok: false, reason: 'no_openai_key' }, { status: 400 })
  }

  const prompt = [
    title ? `Titulo de la tarea: ${title}` : null,
    `Descripcion: ${description}`,
    'Devuelve subtareas concretas y accionables.',
    'Responde solo en JSON con el formato: {"subtasks": ["..."]}.',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: 'Eres un asistente que convierte descripciones de tareas en subtareas concretas. Responde solo JSON valido.',
              },
            ],
          },
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'subtasks_schema',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                subtasks: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['subtasks'],
            },
          },
        },
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: 'openai_error' }, { status: 500 })
    }

    const json = await res.json()
    const outputText =
      json?.output?.[0]?.content?.find((c: { type: string }) => c.type === 'output_text')?.text ??
      json?.output_text ??
      ''

    const parsed = JSON.parse(outputText) as OpenAIJson
    const subtasks = Array.isArray(parsed.subtasks)
      ? parsed.subtasks.map(s => String(s).trim()).filter(Boolean).slice(0, 12)
      : []

    return NextResponse.json({ ok: true, subtasks })
  } catch (err) {
    return NextResponse.json({ ok: false, reason: String(err) }, { status: 500 })
  }
}
