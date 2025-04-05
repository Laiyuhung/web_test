import supabase from '@/lib/supabase'

export async function POST(request) {
  try {
    const { name, age } = await request.json()
    if (!name || !age) {
      return Response.json({ error: 'Missing name or age' }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert([{ name, age: parseInt(age) }])

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    const { data, error: selectError } = await supabase.from('users').select('*')
    if (selectError) {
      return Response.json({ error: selectError.message }, { status: 500 })
    }

    return Response.json({ data })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  const { data, error } = await supabase.from('users').select('*')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ data })
}
