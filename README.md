# 工程研發專案管理系統 (PMS) - 本機執行說明

本專案已重構為可在 Windows 本地電腦獨立穩定運行的版本。

---

## 🚀 快速啟動與關閉方式

本專案已為您準備了專屬的啟動與關閉腳本，支援**直接雙擊執行**或從**終端機執行**：

### 方式一：直接在檔案總管中「雙擊滑鼠」（最推薦、最直覺）
1. **啟動伺服器**：雙擊專案目錄下的 [`start.bat`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/start.bat)。
   - 系統會自動檢查並安裝缺少的套件。
   - 自動啟動 Vite 伺服器並自動在瀏覽器中打開 `http://localhost:3000`。
2. **關閉伺服器**：雙擊專案目錄下的 [`stop.bat`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/stop.bat)。
   - 會自動偵測並強制終止佔用 3000 連接埠的伺服器程序，乾淨釋放連接埠。

---

### 方式二：在 VS Code / PowerShell 終端機中執行
```bash
# 啟動伺服器
npm start
# 或直接執行
.\start.ps1

# 關閉伺服器
npm stop
# 或直接執行
.\stop.ps1
```

---

## 📂 腳本架構說明

* [`start.bat`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/start.bat) / [`start.ps1`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/start.ps1) ➔ 調用 [`scripts/start-server.js`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/scripts/start-server.js)
  * 自動檢查 `node_modules`，若未安裝自動呼叫 `npm install`。
  * 偵測 3000 連接埠是否佔用。
  * 啟動 Vite 開發伺服器，並於伺服器就緒後自動彈出預設瀏覽器訪問 `http://localhost:3000`。
* [`stop.bat`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/stop.bat) / [`stop.ps1`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/stop.ps1) ➔ 調用 [`scripts/stop-server.js`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/scripts/stop-server.js)
  * 自動搜尋佔用 3000 連接埠的 PID，以樹狀結構完全終止程序（避免關閉視窗後背景殘留導致下次啟動失敗）。
* [`.env`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/.env)：本地環境設定檔。
