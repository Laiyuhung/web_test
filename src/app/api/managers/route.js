import supabase from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('managers')
    .select('id, team_name')
    .in('id', [1, 2, 3, 4])

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
