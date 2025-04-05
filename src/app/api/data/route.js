import supabase from '@/lib/supabase'

export async function POST(request) {
  try {
    const start = Date.now() // 🔴 開始計時

    const { name, age } = await request.json()
    if (!name || !age) {
      return Response.json({ error: '缺少 name 或 age' }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert([{ name, age: parseInt(age) }])

    if (insertError) {
      console.error('❌ INSERT 錯誤:', insertError)
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    const { data, error: selectError } = await supabase.from('users').select('*')
    if (selectError) {
      console.error('❌ SELECT 錯誤:', selectError)
      return Response.json({ error: selectError.message }, { status: 500 })
    }

    const elapsed = Date.now() - start // 🔴 結束計時
    console.log(`🕒 Supabase 插入 + 查詢共耗時 ${elapsed}ms`)

    return Response.json({ data, elapsed })

  } catch (err) {
    console.error('❌ 例外錯誤:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
