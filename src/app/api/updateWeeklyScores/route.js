import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST() {
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  for (const week of weeks) {
    const res = await fetch('https://your-domain.com/api/weekly_stats_by_manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week })
    })
    const result = await res.json()

    for (const team of result) {
      await supabase
        .from('weekly_scores')
        .upsert({
          week,
          team_name: team.team_name,
          fantasy_total: parseFloat(team.fantasyPoints.Total),
        }, { onConflict: ['week', 'team_name'] })
    }
  }

  return NextResponse.json({ message: '更新完成 ✅' })
}
