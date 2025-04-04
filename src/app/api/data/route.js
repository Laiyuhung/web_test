let database = [] // 模擬資料庫

export async function POST(request) {
  const { name, age } = await request.json()
  database.push({ name, age })
  return Response.json({ success: true, data: database })
}

export async function GET() {
  return Response.json({ data: database })
}