# 第 2 章：視覺化敏捷看板規格 (Kanban Board)

## 1. 欄位與狀態模型
看板由多個欄位（Columns）組成，預設狀態包括：
* **待處理 (Backlog)**
* **進行中 (In Progress)**
* **審查中 (In Review)**
* **已完成 (Done)**

## 2. 任務卡片規格 (Task Card)
* **資料欄位**：標題、描述、優先級（LOW, MEDIUM, HIGH, URGENT）、負責人（Assignee）、預估工時、實際耗時、到期日、關聯標籤、關聯 RFI。
* **排序演算法**：使用浮點數位置算法（Lexorank/Float Position），拖曳調整卡片順序時僅需更新目標卡片位置數值。
* **任務互動彈窗 (TaskModal)**：支援檢視與編輯任務詳情、即時發表評論、@提及成員、以及直接貼上截圖。
