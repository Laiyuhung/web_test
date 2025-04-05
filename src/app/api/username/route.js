import supabase from '@/lib/supabase'

export async function POST(req) {
  const { user_id } = await req.json()

  const { data, error } = await supabase
    .from('managers')
    .select('name')
    .eq('id', user_id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ name: data.name })
}
