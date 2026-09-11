# AI Agent 協作指南與開發規範 (AGENTS.md)

本文件定義所有 AI Agent（包括 Antigravity / Cursor / Copilot 等）在本專案中的行為準則、工作流程與品質規範。所有參與本專案開發之 Agent **必須無條件嚴格遵守**。

---

## 🎯 核心工作流程規範 (Core Workflow Policy)

```
[使用者提出需求]
       ▼
[1. 討論與架構對齊] (釐清範圍、確認技術細節與 UI/UX)
       ▼
[2. 撰寫開發計畫] (於 doc/dev/ 建立 plan_<功能名稱>.md)
       ▼
[3. 獲得使用者確認]
       ▼
[4. 參照計畫實施開發] (保持代碼整潔、型別安全、本地驗證)
       ▼
[5. 驗證與測試] (tsc --noEmit, npm run build, 伺服器測試)
       ▼
[6. 規格回寫] (將最終完成功能回寫至 doc/spec/ 分章節規格)
```

### 1. 開發前先討論與寫計畫
- **禁止未擬定計畫即直接修改業務代碼**。
- 開工前必須先與使用者進行討論，確認需求背景與技術可行性。
- 將討論結論與實作步驟撰寫為 Markdown 檔案，放置於 [`doc/dev/`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/doc/dev/) 目錄。
- **檔案命名規範**：必須嚴格遵守 `plan_<功能名稱>.md`（例如：`plan_sheet_versioning.md`、`plan_cad_preview.md`）。可參考 [`doc/dev/plan_template.md`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/doc/dev/plan_template.md)。

### 2. 開發中參照計畫執行
- 開發時應將計畫作為 Check List，按部就班逐步實現。
- 若開發中發現原計畫有重大技術偏差，必須先更新計畫並向使用者說明。

### 3. 開發完成後回寫規格
- 功能開發與驗收通過後，**必須將最終的資料結構、API 行為與 UI 規則寫回 [`doc/spec/`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/doc/spec/) 目錄中對應的章節**。
- 若為全新模組，應於 `doc/spec/` 建立新章節（如 `06_<模組名稱>.md`），並更新 `doc/spec/README.md` 的章節索引。

---

## 💻 本地環境與腳本操作準則 (Environment & Scripts)

- **作業系統**：Windows。
- **伺服器管理**：
  - 啟動伺服器：使用 [`start.bat`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/start.bat) 或 `node scripts/start-server.js`。
  - 關閉伺服器：使用 [`stop.bat`](file:///c:/Users/吉咪/Documents/vscode-project/20260911_coding-/stop.bat) 或 `node scripts/stop-server.js`。
  - 注意 Windows PowerShell 執行原則（ExecutionPolicy），執行 npm 指令時優先採用 `npm.cmd` 或以 Node 腳本包裝。
- **品質驗證指令**：
  - 型別檢查：`npm.cmd run lint` (`tsc --noEmit`)
  - 建置檢查：`npm.cmd run build` (`vite build`)

---

## 🔍 程式碼審查與品質原則 (Code Review & Quality Standards)

1. **正確性 (Correctness)**：不可引入未經處理的 Exception 或破壞現有功能合約。
2. **安全性 (Security)**：輸入值驗證、避免 XSS、嚴格檢查角色權限（RBAC）。
3. **可維護性 (Maintainability)**：
   - 清楚命名變數與函式，保留現有架構既有之註解。
   - 遵守 TypeScript 嚴格型別，禁止無故使用 `any`。
4. **優先級標記**：
   - 🔴 **Blocker**：影響系統安全、資料損毀、型別編譯失敗、嚴重 Bug（必須立即修復）。
   - 🟡 **Suggestion**：效能優化、缺少邊界檢驗、代碼可抽像重複（強烈建議處理）。
   - 💭 **Nit**：代碼風格美化、小命名微調（可選擇性採納）。

---

## 🗣️ 溝通風格
- 使用繁體中文（台灣工程與建築習慣用語）。
- 語氣清晰、條理分明、具建設性。
