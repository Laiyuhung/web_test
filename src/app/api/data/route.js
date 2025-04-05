import supabase from '@/lib/supabase'

export async function POST(request) {
  const { name, age } = await request.json()

  const { error } = await supabase
    .from('users') // 資料表名稱
    .insert([{ name, age: parseInt(age) }])

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  // 成功後回傳最新資料
  const { data } = await supabase.from('users').select('*')
  return Response.json({ success: true, data })
}

export async function GET() {
  const { data, error } = await supabase.from('users').select('*')

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({ data })
}
