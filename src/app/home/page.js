return (
    <div className="p-6">
      <div className="mb-4 flex gap-2 flex-wrap">
        <Button
          onClick={() => handleFilter(currentWeek)}
          variant={selectedWeek === currentWeek ? 'default' : 'outline'}
        >
          This week ⭐
        </Button>
        <Button
          onClick={() => handleFilter('')}
          variant={selectedWeek === '' ? 'default' : 'outline'}
        >
          All schedule
        </Button>
      </div>
  
      {/* 🏆 賽程表卡片 */}
      <Card>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Week</th>
                <th className="p-2">Date</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
                <th className="p-2">Team</th>
                <th className="p-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-bold">{s.week}</td>
                  <td className="p-2">{s.date_range}</td>
                  <td className="p-2">{s.team1}</td>
                  <td className="p-2">{s.score1}</td>
                  <td className="p-2">{s.team2}</td>
                  <td className="p-2">{s.score2}</td>
                  <td className="p-2">{s.team3}</td>
                  <td className="p-2">{s.score3}</td>
                  <td className="p-2">{s.team4}</td>
                  <td className="p-2">{s.score4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
  
      {/* 🔻 戰績 Tabs 放在賽程表下面 */}
      <Tabs defaultValue="firstHalf" className="mt-6">
        <TabsList>
          <TabsTrigger value="firstHalf">上半季戰績</TabsTrigger>
          <TabsTrigger value="secondHalf">下半季戰績</TabsTrigger>
          <TabsTrigger value="season">整季戰績</TabsTrigger>
        </TabsList>
  
        <TabsContent value="firstHalf">{renderStandingTable('firstHalf')}</TabsContent>
        <TabsContent value="secondHalf">{renderStandingTable('secondHalf')}</TabsContent>
        <TabsContent value="season">{renderStandingTable('season')}</TabsContent>
      </Tabs>
    </div>
  )
  