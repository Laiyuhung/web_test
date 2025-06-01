import supabase from '@/lib/supabase'

// GET: 取得所有違規紀錄（含隊名）
export async function GET(request) {
  const { data, error } = await supabase
    .from('pitcher_violation')
    .select('id, week, manager_id')
    .order('week', { ascending: true })
    .order('manager_id', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST: 新增違規紀錄 { week, manager_id }
export async function POST(request) {
  const body = await request.json()
  const { week, manager_id } = body
  if (!week || !manager_id) {
    return Response.json({ error: 'week, manager_id required' }, { status: 400 })
  }
  const { error } = await supabase
    .from('pitcher_violation')
    .insert([{ week, manager_id }])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
