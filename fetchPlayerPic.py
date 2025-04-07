import os
import requests
from bs4 import BeautifulSoup

# 設定 URL
url = 'https://www.cpbl.com.tw/team?ClubNo=ACN'

# 添加 User-Agent
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

# 發送 GET 請求
response = requests.get(url, headers=headers)
response.encoding = 'utf-8'

# 解析 HTML
soup = BeautifulSoup(response.text, 'html.parser')

# 嘗試查找 TeamPlayersListWrap
team_players_list_wrap = soup.find('div', class_='TeamPlayersListWrap')
if not team_players_list_wrap:
    print("未找到 TeamPlayersListWrap 元素")
else:
    # 找到所有球員項目
    item_divs = team_players_list_wrap.find_all('div', class_='item')

    # 設定儲存資料夾
    save_folder = './public/photo'
    if not os.path.exists(save_folder):
        os.makedirs(save_folder)

    # 遍歷所有球員項目
    for item in item_divs:
        # 提取背景圖片 URL
        style = item.get('style')
        if style:
            # 從 style 中提取圖片 URL
            img_url = style.split('url(')[1].split(')')[0].strip("'\"")
            # 取得球員名稱 (位於 <span> 中)
            player_name = item.find('span').get_text() if item.find('span') else 'unknown'  # 提取球員名字作為檔名

            # 構建完整的圖片 URL，若圖片 URL 是相對路徑則加上網站主域名
            img_url = 'https://www.cpbl.com.tw' + img_url if img_url.startswith('/') else img_url

            # 下載圖片
            img_data = requests.get(img_url).content

            # 構建檔案名稱
            file_path = os.path.join(save_folder, f'{player_name}.png')

            # 儲存圖片
            with open(file_path, 'wb') as f:
                f.write(img_data)
            print(f'圖片 {player_name}.png 儲存成功')

print("圖片爬取完成！")
