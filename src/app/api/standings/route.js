import supabase from '@/lib/supabase'

export async function POST(req) {
  const { type } = await req.json()

  const validTypes = ['firstHalf', 'secondHalf', 'season']
  if (!validTypes.includes(type)) {
    return Response.json({ error: 'Invalid type' }, { status: 400 })
  }

  const cols = [
    `${type}_1st`,
    `${type}_2nd`,
    `${type}_3rd`,
    `${type}_4th`,
    `${type}_points`,
  ]

  const { data, error } = await supabase
    .from('standings')
    .select(`id, ${cols.join(', ')}`)
    .order(`${type}_points`, { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
