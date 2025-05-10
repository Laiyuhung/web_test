import supabase from '@/lib/supabase'

export async function POST(req) {
  const { id } = await req.json()
  const { data, error } = await supabase
    .from('managers')
    .select('account, password, team_name')
    .eq('id', id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
