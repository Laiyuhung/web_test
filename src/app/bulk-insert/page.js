'use client'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

export default function BulkInsertPage() {

  const todayStr = new Date().toISOString().split('T')[0]
  const [submittedTeams, setSubmittedTeams] = useState([])
  const [newMakeupGame, setNewMakeupGame] = useState({ game_no: '', date: '', time: '', away: '', home: '', stadium: '' })


  const [makeupGames, setMakeupGames] = useState([])
  const [loadingMakeups, setLoadingMakeups] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(todayStr)
  const [schedules, setSchedules] = useState([])
  const [editingSchedule, setEditingSchedule] = useState(null)

  const [text, setText] = useState('')
  const [date, setDate] = useState(todayStr)
  const [isMajor, setIsMajor] = useState(true)
  const [isPitcher, setIsPitcher] = useState(false)

  const [lineupDate, setLineupDate] = useState(todayStr)
  const [lineupTeam, setLineupTeam] = useState('')
  const [battingOrder, setBattingOrder] = useState(Array(9).fill(''))

  const [moveText, setMoveText] = useState('')
  const [moveDate, setMoveDate] = useState(todayStr)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')


  const [rewardManagerId, setRewardManagerId] = useState('')
  const [rewardEvent, setRewardEvent] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')
  const [managers, setManagers] = useState([])

  const [starterName, setStarterName] = useState('')
  const [starterDate, setStarterDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [startingPitchers, setStartingPitchers] = useState([])

  // 投手違規名單
  const [violationWeek, setViolationWeek] = useState('')
  const [violationManagerId, setViolationManagerId] = useState('')
  const [violationLoading, setViolationLoading] = useState(false)
  const [violationList, setViolationList] = useState([])
  const weeks = Array.from({ length: 18 }, (_, i) => `W${i + 1}`)

  const handleLoadMakeupGames = async () => {
    setLoadingMakeups(true)
    const res = await fetch('/api/schedule/ppd_schedule')
    const result = await res.json()
    if (res.ok) {
      setMakeupGames(result)
    }
    setLoadingMakeups(false)
  }

  const loadScheduleByDate = async () => {
    const res = await fetch(`/api/schedule/daily?date=${scheduleDate}`)
    const result = await res.json()
    if (res.ok) {
      setSchedules(result)
    }
  }


  const handleEditSchedule = (schedule) => {
    setEditingSchedule({ ...schedule })  // 深拷貝避免直接改原資料
  }

  const handleScheduleChange = (field, value) => {
    setEditingSchedule(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmitSchedule = async () => {
    const res = await fetch('/api/schedule/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingSchedule),
    })
    const result = await res.json()

    if (res.ok) {
      setDialogMessage(editingSchedule.uuid ? '✅ 賽程更新成功' : '✅ 新增賽程成功')
      // 如果是延期，且補賽資訊都有填，就新增一筆補賽記錄
      if (
        editingSchedule.is_postponed &&
        editingSchedule.makeup_date &&
        editingSchedule.makeup_time &&
        editingSchedule.makeup_stadium
      ) {
        await fetch('/api/schedule/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: editingSchedule.makeup_date,
            time: editingSchedule.makeup_time,
            game_no: editingSchedule.game_no,
            away: editingSchedule.away,
            home: editingSchedule.home,
            stadium: editingSchedule.makeup_stadium,
            is_postponed: false,
          }),
        })
      }

      setEditingSchedule(null)
      await loadScheduleByDate()
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
    }
    setDialogOpen(true)
  }

  const loadSubmittedTeams = async () => {
    const res = await fetch(`/api/starting-lineup/teams?date=${lineupDate}`)
    const result = await res.json()
    if (res.ok && Array.isArray(result)) {
      setSubmittedTeams(result)
    }
  }
  
  const handleBattingChange = (index, value) => {
    const updated = [...battingOrder]
    updated[index] = value
    setBattingOrder(updated)
  }

  const handleSubmitNewMakeupGame = async () => {
    const { game_no, date, time, away, home, stadium } = newMakeupGame
    if (!game_no || !date || !time || !away || !home || !stadium) {
      setDialogMessage('⚠️ 請完整填寫所有欄位')
      setDialogOpen(true)
      return
    }

    const res = await fetch('/api/schedule/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_no,
        date,
        time,
        away,
        home,
        stadium,
        is_postponed: false,
      }),
    })

    const result = await res.json()
    if (res.ok) {
      setDialogMessage('✅ 補賽新增成功')
      setNewMakeupGame({ game_no: '', date: '', time: '', away: '', home: '', stadium: '' })
      await handleLoadMakeupGames()
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
    }
    setDialogOpen(true)
  }

  
  const handleSubmitLineup = async () => {
    if (!lineupTeam) {
      setDialogMessage('⚠️ 請先選擇球隊')
      setDialogOpen(true)
      return
    }
  
    if (battingOrder.some(name => !name.trim())) {
      setDialogMessage('⚠️ 所有九個打序欄位都必須填寫')
      setDialogOpen(true)
      return
    }
  
    const rows = battingOrder.map((name, i) => ({
      date: lineupDate,
      team: lineupTeam,
      name: name.trim(),
      batting_no: i + 1,
    }))
  
    const res = await fetch('/api/starting-lineup/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
  
    const result = await res.json()
    if (res.ok) {
      setDialogMessage('✅ 打序登錄成功')
      setBattingOrder(Array(9).fill(''))
      await loadSubmittedTeams() // ⬅️ 登錄成功後重新載入列表
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
    }
    setDialogOpen(true)
  }
  


  const handleInsertStarter = async () => {
    if (!starterDate || !starterName) return
  
    const res = await fetch('/api/starting-pitcher/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: starterDate, name: starterName }),
    })
    const result = await res.json()
  
    if (res.ok) {
      setStarterName('') // ⬅️ 清空輸入欄位
      setDialogMessage('✅ 先發投手已登錄成功')
      setDialogOpen(true)
      await loadTomorrowStarters()
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
      setDialogOpen(true)
    }
  }
  
  const loadTomorrowStarters = async () => {
    const res = await fetch(`/api/starting-pitcher/load?date=${starterDate}`)
    const result = await res.json()
    if (res.ok) {
      setStartingPitchers(result)
    }
  }
  
  
  const handleSubmit = async () => {
    const endpoint = isPitcher ? '/api/pitching-insert' : '/api/bulk-insert'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date, isMajor }),
    })
    const result = await res.json()

    if (res.ok) {
      setText('')
      setDialogMessage('✅ 成績匯入成功，並已自動更新週得分。')
      await fetch('/api/updateWeeklyScores', { method: 'POST' })
    } else {
      setDialogMessage(`❌ 成績匯入失敗：${result.error || '請稍後再試。'}`)
    }
    setDialogOpen(true)
  }

  const handleMovementSubmit = async () => {
    const res = await fetch('/api/movement-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: moveText, date: moveDate }),
    })
    const result = await res.json()

    if (res.ok) {
      setMoveText('')
      setDialogMessage('✅ 異動登錄成功')
    } else {
      setDialogMessage(`❌ 異動失敗：${result.error || '請稍後再試。'}`)
    }
    setDialogOpen(true)
  }

  const handleSubmitReward = async () => {
    if (!rewardManagerId || !rewardEvent || !rewardAmount) {
      setDialogMessage('⚠️ 請完整填寫所有欄位')
      setDialogOpen(true)
      return
    }
  
    const res = await fetch('/api/rewards/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manager: rewardManagerId,
        event: rewardEvent,
        awards: parseInt(rewardAmount, 10),
      }),
    })
  
    const result = await res.json()
    if (res.ok) {
      setDialogMessage('✅ 獎金登錄成功')
      setRewardManagerId('')
      setRewardEvent('')
      setRewardAmount('')
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
    }
    setDialogOpen(true)
  }

  const fetchViolationList = async () => {
    const res = await fetch('/api/pitcher_violation')
    const result = await res.json()
    if (res.ok) setViolationList(result)
  }

  const handleAddViolation = async () => {
    if (!violationWeek || !violationManagerId) {
      setDialogMessage('⚠️ 請選擇週次與球隊')
      setDialogOpen(true)
      return
    }
    setViolationLoading(true)
    const res = await fetch('/api/pitcher_violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: violationWeek, manager_id: violationManagerId })
    })
    const result = await res.json()
    if (res.ok) {
      setDialogMessage('✅ 違規名單已新增')
      setViolationWeek('')
      setViolationManagerId('')
      fetchViolationList()
    } else {
      setDialogMessage(`❌ 錯誤：${result.error || '請稍後再試'}`)
    }
    setViolationLoading(false)
    setDialogOpen(true)
  }

  useEffect(() => {
    const fetchManagers = async () => {
      const res = await fetch('/api/rewards/managers')
      const result = await res.json()
      if (res.ok) {
        setManagers(result)
      }
    }
    fetchManagers()
  }, [])

  useEffect(() => {
    loadTomorrowStarters()
  }, [starterDate])

  useEffect(() => {
    loadSubmittedTeams()
  }, [lineupDate]) // 👈 每當 lineupDate 改變就重新載入球隊列表

  useEffect(() => {
    fetchViolationList()
  }, [])

  return (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">成績批次匯入</h1>

        <div className="mb-4 flex gap-4 items-center flex-wrap">
          <div>
            <label className="block text-sm mb-1">比賽日期</label>
            <input
              type="date"
              className="border px-3 py-1 rounded"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">一軍</label>
            <select
              className="border px-3 py-1 rounded"
              value={isMajor ? '1' : '0'}
              onChange={e => setIsMajor(e.target.value === '1')}
            >
              <option value="1">是</option>
              <option value="0">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">匯入類型</label>
            <select
              className="border px-3 py-1 rounded"
              value={isPitcher ? 'pitcher' : 'batter'}
              onChange={e => setIsPitcher(e.target.value === 'pitcher')}
            >
              <option value="batter">打者</option>
              <option value="pitcher">投手</option>
            </select>
          </div>
        </div>

        <textarea
          className="w-full h-96 border p-3 text-sm"
          placeholder="貼上打者或投手數據..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <Button onClick={handleSubmit} className="mt-4">送出</Button>

        {/* 🔽 升降異動欄位 */}
        <h2 className="text-lg font-bold mt-10 mb-2">球員升降登錄</h2>
        <div className="mb-3">
          <label className="block text-sm mb-1">異動日期</label>
          <input
            type="date"
            className="border px-3 py-1 rounded"
            value={moveDate}
            onChange={e => setMoveDate(e.target.value)}
          />
        </div>
        <textarea
          className="w-full h-64 border p-3 text-sm"
          placeholder="無須貼上日期"
          value={moveText}
          onChange={e => setMoveText(e.target.value)}
        />
        <Button onClick={handleMovementSubmit} className="mt-4">送出升降異動</Button>


        <h2 className="text-lg font-bold mt-10 mb-2">登錄先發投手（明日）</h2>
        <div className="mb-3 flex gap-3 flex-wrap items-center">
          <div>
            <label className="block text-sm mb-1">日期</label>
            <input
              type="date"
              className="border px-3 py-1 rounded"
              value={starterDate}
              onChange={(e) => setStarterDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">投手名稱</label>
            <input
              type="text"
              className="border px-3 py-1 rounded"
              placeholder="如：古林睿煬"
              value={starterName}
              onChange={(e) => setStarterName(e.target.value)}
            />
          </div>
          <Button onClick={handleInsertStarter}>送出先發投手</Button>
        </div>

        <div className="mt-4 text-sm">
          <span className="font-semibold">明日已登錄先發：</span>
          {startingPitchers.length === 0
            ? <span className="text-gray-500 ml-1">尚無資料</span>
            : startingPitchers.map((p, i) => (
                <span key={i} className="inline-block bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded mr-2 mt-1">
                  {p.name}
                </span>
              ))}
        </div>

        <h2 className="text-lg font-bold mt-10 mb-2">今日打序登錄</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          {/* 日期 */}
          <div>
            <label className="block text-sm mb-1">日期</label>
            <input
              type="date"
              className="border px-3 py-1 rounded"
              value={lineupDate}
              onChange={(e) => setLineupDate(e.target.value)}
            />
          </div>

          {/* 球隊選單 */}
          <div>
            <label className="block text-sm mb-1">球隊</label>
            <select
              className="border px-3 py-1 rounded"
              value={lineupTeam}
              onChange={(e) => setLineupTeam(e.target.value)}
            >
              <option value="">請選擇</option>
              <option>統一獅</option>
              <option>樂天桃猿</option>
              <option>富邦悍將</option>
              <option>味全龍</option>
              <option>中信兄弟</option>
              <option>台鋼雄鷹</option>
            </select>
          </div>
        </div>

        {/* 1～9棒 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {battingOrder.map((name, idx) => (
            <div key={idx}>
              <label className="text-sm">第 {idx + 1} 棒</label>
              <input
                type="text"
                className="border w-full px-3 py-1 rounded"
                value={name}
                onChange={(e) => handleBattingChange(idx, e.target.value)}
                placeholder="球員名稱"
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSubmitLineup}>送出打序</Button>
        
        <div className="mt-4 text-sm">
          <span className="font-semibold">今日已登錄打序球隊：</span>
          {submittedTeams.length === 0
            ? <span className="text-gray-500 ml-1">尚無資料</span>
            : submittedTeams.map((team, idx) => (
                <span key={idx} className="inline-block bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded mr-2 mt-1">
                  {team}
                </span>
              ))}
        </div>


        <h2 className="text-lg font-bold mt-10 mb-2">獎金登錄</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1">球隊（Manager）</label>
            <select
              className="border px-3 py-1 rounded"
              value={rewardManagerId}
              onChange={(e) => setRewardManagerId(e.target.value)}
            >
              <option value="">請選擇</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.team_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">事件</label>
            <input
              type="text"
              className="border px-3 py-1 rounded"
              placeholder="如：單週冠軍"
              value={rewardEvent}
              onChange={(e) => setRewardEvent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">獎金金額</label>
            <input
              type="number"
              className="border px-3 py-1 rounded"
              placeholder="例如 1000"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSubmitReward}>送出獎金登錄</Button>

        <h2 className="text-lg font-bold mt-10 mb-2">編輯每日賽程</h2>

        <div className="flex items-center gap-4 mb-4">
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="border px-3 py-1 rounded"
          />
          <Button onClick={loadScheduleByDate}>載入賽程</Button>
        </div>

        <ul className="text-sm mb-4 space-y-2">
          {schedules.map((game, idx) => (
            <li key={idx} className="border p-2 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-medium">{game.time}</span> ｜ {game.away} vs {game.home} ｜ {game.stadium}
              </div>
              <Button size="sm" onClick={() => handleEditSchedule(game)}>編輯</Button>
            </li>
          ))}
        </ul>

        {/* 編輯表單 */}
        {editingSchedule && (
          <div className="border rounded p-4 space-y-3 bg-gray-50">
            <h3 className="text-base font-semibold">編輯賽程</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
              <label className="block text-sm mb-1">日期</label>
              <input
                className="border px-3 py-1 rounded"
                value={editingSchedule.date}
                type="date"
                onChange={(e) => handleScheduleChange('date', e.target.value)}
              />
              </div>
              <div>
              <label className="block text-sm mb-1">時間</label>
              <input
                className="border px-3 py-1 rounded"
                value={editingSchedule.time}
                placeholder="時間，例如 18:35"
                onChange={(e) => handleScheduleChange('time', e.target.value)}
              />
              </div>
              <div>
              <label className="block text-sm mb-1">賽事編號</label>
              <input
                className="border px-3 py-1 rounded"
                value={editingSchedule.game_no}
                placeholder="Game No"
                onChange={(e) => handleScheduleChange('game_no', e.target.value)}
              />
              </div>
              <div>
              <label className="block text-sm mb-1">客隊</label>
              <input
                className="border px-3 py-1 rounded"
                value={editingSchedule.away}
                placeholder="客隊"
                onChange={(e) => handleScheduleChange('away', e.target.value)}
              />
              </div>
              <div>
              <label className="block text-sm mb-1">主隊</label>
              <input
                className="border px-3 py-1 rounded"
                value={editingSchedule.home}
                placeholder="主隊"
                onChange={(e) => handleScheduleChange('home', e.target.value)}
              />
              </div>
              <div>
              <label className="block text-sm mb-1">球場</label>
              <input
                className="border px-3 py-1 rounded"
                value={editingSchedule.stadium}
                placeholder="球場"
                onChange={(e) => handleScheduleChange('stadium', e.target.value)}
              />
              </div>
              <select
                className="border px-3 py-1 rounded"
                value={editingSchedule.is_postponed ? '1' : '0'}
                onChange={(e) => handleScheduleChange('is_postponed', e.target.value === '1')}
              >
                <option value="0">正常進行</option>
                <option value="1">延賽</option>
              </select>
              {editingSchedule.is_postponed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <input
                    className="border px-3 py-1 rounded"
                    placeholder="補賽日期，如 2025-05-25 或 待定"
                    value={editingSchedule.makeup_date || ''}
                    onChange={(e) => handleScheduleChange('makeup_date', e.target.value)}
                  />
                  <input
                    className="border px-3 py-1 rounded"
                    placeholder="補賽時間，如 18:35 或 待定"
                    value={editingSchedule.makeup_time || ''}
                    onChange={(e) => handleScheduleChange('makeup_time', e.target.value)}
                  />
                  <input
                    className="border px-3 py-1 rounded"
                    placeholder="補賽球場，如 洲際 或 待定"
                    value={editingSchedule.makeup_stadium || ''}
                    onChange={(e) => handleScheduleChange('makeup_stadium', e.target.value)}
                  />
                </div>
              )}

            </div>

            <div className="flex gap-4 mt-3">
              <Button onClick={handleSubmitSchedule}>送出修改</Button>
              <Button variant="outline" onClick={() => setEditingSchedule(null)}>取消</Button>
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold mt-10 mb-2">獨立新增補賽</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <input className="border px-3 py-1 rounded" placeholder="Game No" value={newMakeupGame.game_no}
            onChange={(e) => setNewMakeupGame({ ...newMakeupGame, game_no: e.target.value })} />
          <input className="border px-3 py-1 rounded" placeholder="日期" type="date" value={newMakeupGame.date}
            onChange={(e) => setNewMakeupGame({ ...newMakeupGame, date: e.target.value })} />
          <input className="border px-3 py-1 rounded" placeholder="時間" value={newMakeupGame.time}
            onChange={(e) => setNewMakeupGame({ ...newMakeupGame, time: e.target.value })} />
          <input className="border px-3 py-1 rounded" placeholder="客隊" value={newMakeupGame.away}
            onChange={(e) => setNewMakeupGame({ ...newMakeupGame, away: e.target.value })} />
          <input className="border px-3 py-1 rounded" placeholder="主隊" value={newMakeupGame.home}
            onChange={(e) => setNewMakeupGame({ ...newMakeupGame, home: e.target.value })} />
          <input className="border px-3 py-1 rounded" placeholder="球場" value={newMakeupGame.stadium}
            onChange={(e) => setNewMakeupGame({ ...newMakeupGame, stadium: e.target.value })} />
        </div>
        <Button onClick={handleSubmitNewMakeupGame}>送出新增補賽</Button>


        <h2 className="text-lg font-bold mt-10 mb-2">補賽賽程查詢</h2>
        <Button onClick={handleLoadMakeupGames}>載入補賽賽程</Button>

        {loadingMakeups ? (
          <p className="text-sm mt-2 text-gray-500">載入中...</p>
        ) : makeupGames.length === 0 ? (
          <p className="text-sm mt-2 text-gray-500">尚無補賽資料</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="table-auto border text-sm min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">Game No</th>
                  <th className="border px-2 py-1">場次</th>
                  <th className="border px-2 py-1">日期</th>
                  <th className="border px-2 py-1">時間</th>
                  <th className="border px-2 py-1">對戰</th>
                  <th className="border px-2 py-1">球場</th>
                  <th className="border px-2 py-1">是否延期</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(makeupGames).map(([gameNo, games]) => (
                  games.map((game, idx) => (
                    <tr key={`${gameNo}-${idx}`} className="text-center">
                      {idx === 0 && (
                        <td className="border px-2 py-1 font-semibold" rowSpan={games.length}>
                          {gameNo}
                        </td>
                      )}
                      <td className="border px-2 py-1">{idx + 1}</td>
                      <td className="border px-2 py-1">{game.date}</td>
                      <td className="border px-2 py-1">{game.time}</td>
                      <td className="border px-2 py-1">{game.away} vs {game.home}</td>
                      <td className="border px-2 py-1">{game.stadium}</td>
                      <td className="border px-2 py-1">{game.is_postponed ? '是（原延期）' : '否（補賽）'}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>

        )}

        <h2 className="text-lg font-bold mt-10 mb-2">投手違規名單登錄</h2>
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div>
            <label className="block text-sm mb-1">週次</label>
            <select className="border px-3 py-1 rounded" value={violationWeek} onChange={e => setViolationWeek(e.target.value)}>
              <option value="">請選擇</option>
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">球隊（Manager）</label>
            <select className="border px-3 py-1 rounded" value={violationManagerId} onChange={e => setViolationManagerId(e.target.value)}>
              <option value="">請選擇</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.team_name}</option>)}
            </select>
          </div>
          <Button onClick={handleAddViolation} disabled={violationLoading}>新增違規</Button>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">已登錄違規名單</h3>
          <table className="table-auto border text-sm min-w-[300px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">週次</th>
                <th className="border px-2 py-1">球隊</th>
              </tr>
            </thead>
            <tbody>
              {violationList.length === 0 ? (
                <tr><td colSpan={2} className="text-center text-gray-400">尚無資料</td></tr>
              ) : violationList.map(v => (
                <tr key={v.id}>
                  <td className="border px-2 py-1">{v.week}</td>
                  <td className="border px-2 py-1">{v.managers?.team_name || v.manager_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ✅ 提示結果 Dialog 共用 */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>操作結果</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDialogOpen(false)}>關閉</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 新增球員表單 */}
      <h2 className="text-lg font-bold mt-10 mb-2">新增球員</h2>
      <form
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8"
        onSubmit={async e => {
          e.preventDefault();
          const form = e.target;
          const Name = form.Name.value.trim();
          const Team = form.Team.value.trim();
          const 原名 = form.原名.value.trim();
          const pitch_side = form.pitch_side.value.trim();
          const identity = form.identity.value.trim();
          const B_or_P = form.B_or_P.value.trim();
          if (!Name || !Team || !原名 || !pitch_side || !identity || !B_or_P) {
            setDialogMessage('⚠️ 所有欄位皆為必填');
            setDialogOpen(true);
            return;
          }
          const res = await fetch('/api/playerslist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Name, Team, 原名, pitch_side, identity, B_or_P })
          });
          const result = await res.json();
          if (res.ok) {
            setDialogMessage('✅ 新增球員成功');
            form.reset();
          } else {
            setDialogMessage(`❌ 新增球員失敗：${result.error || '請稍後再試'}`);
          }
          setDialogOpen(true);
        }}
      >
        <div>
          <label className="block text-sm mb-1">姓名</label>
          <input name="Name" required className="border px-3 py-1 rounded w-full" placeholder="球員姓名" />
        </div>
        <div>
          <label className="block text-sm mb-1">所屬球隊</label>
          <input name="Team" required className="border px-3 py-1 rounded w-full" placeholder="所屬球隊" />
        </div>
        <div>
          <label className="block text-sm mb-1">原名</label>
          <input name="原名" required className="border px-3 py-1 rounded w-full" placeholder="原名" />
        </div>
        <div>
          <label className="block text-sm mb-1">左/右投</label>
          <input name="pitch_side" className="border px-3 py-1 rounded w-full" placeholder="左/右投" />
        </div>
        <div>
          <label className="block text-sm mb-1">身份</label>
          <select name="identity" required className="border px-3 py-1 rounded w-full">
            <option value="">請選擇</option>
            <option value="本土">本土</option>
            <option value="洋將">洋將</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">打/投</label>
          <select name="B_or_P" required className="border px-3 py-1 rounded w-full">
            <option value="">請選擇</option>
            <option value="Batter">打者</option>
            <option value="Pitcher">投手</option>
          </select>
        </div>
        <div className="sm:col-span-2 md:col-span-3">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">送出新增球員</button>
        </div>
      </form>

    </>
  )
}
