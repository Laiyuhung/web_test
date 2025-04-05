export default function HomePage() {
    const schedule = [
      { week: 'W1', start: '3/29', end: '4/6' },
      { week: 'W2', start: '4/7', end: '4/13' },
      { week: 'W3', start: '4/14', end: '4/20' },
      { week: 'W4', start: '4/21', end: '4/27' },
      { week: 'W5', start: '4/28', end: '5/4' },
      { week: 'W6', start: '5/5', end: '5/11' },
      { week: 'W7', start: '5/12', end: '5/18' },
      { week: 'W8', start: '5/19', end: '5/25' },
      { week: 'W9', start: '5/26', end: '6/1' },
      { week: 'W10', start: '6/2', end: '6/8' },
      { week: 'W11', start: '6/9', end: '6/15' },
      { week: 'W12', start: '7/4', end: '7/13' },
      { week: 'W13', start: '7/14', end: '7/27' },
      { week: 'W14', start: '7/28', end: '8/3' },
      { week: 'W15', start: '8/4', end: '8/10' },
      { week: 'W16', start: '8/11', end: '8/17' },
      { week: 'W17', start: '8/18', end: '8/24' },
      { week: 'W18', start: '8/25', end: '8/31' },
    ]
  
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">2025 賽季賽程</h1>
        <table className="w-full border-collapse border border-gray-300 text-center">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-300 p-2">週次</th>
              <th className="border border-gray-300 p-2">開始</th>
              <th className="border border-gray-300 p-2">結束</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, i) => (
              <tr key={i}>
                <td className="border border-gray-300 p-2">{row.week}</td>
                <td className="border border-gray-300 p-2">{row.start}</td>
                <td className="border border-gray-300 p-2">{row.end}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  