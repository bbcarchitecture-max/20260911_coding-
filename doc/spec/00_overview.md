# 第 0 章：系統總覽與核心架構規格

## 1. 系統定位
本系統為專為工程研發、建築與專案團隊設計的**輕量級高互動專案管理平台 (PMS)**，整合了任務流轉（Kanban）、工期時程（Gantt）、工程疑問澄清（RFI）與角色權限管控（RBAC）。

## 2. 技術堆疊
* **前端框架**：React 19 (TypeScript)
* **打包工具**：Vite 6
* **樣式庫**：TailwindCSS v4 + Lucide React 圖示庫
* **動畫庫**：Motion
* **資料層機制**：以 `apiService.ts` 抽象化 API 接口，現階段透過 `localStorage` 達成即時本機持久化，並預留未來接入 RESTful / GraphQL API 或伺服器端 Gemini API 之擴充點。

## 3. 本機運作要求
* Node.js >= v20.x
* 支援由 `start.bat` 一鍵啟動 Vite 開發伺服器（預設連接埠 `3000`），並由 `stop.bat` 安全釋放連接埠。
