# 第 4 章：工程疑問單流程規格 (RFI Workflow)

## 1. 業務場景
工程疑問單（Request For Information, RFI）為營造廠、技師、業主向建築師或專案主持人提出正式設計與圖說澄清之專用單據。

## 2. 狀態流轉圖 (State Transitions)
```
[草稿 DRAFT] ➔ [已提送 SUBMITTED] ➔ [審核中 IN_REVIEW] ➔ [已回覆 ANSWERED] ➔ [結案 CLOSED]
                                                      ↳ [退件 REJECTED]
```

## 3. 稽核紀錄 (Audit Trail)
* 每次狀態變更與回覆意見均會寫入 `rfi_histories` 歷史軌跡表。
* 紀錄操作人（Actor）、動作類型（Action）、時間戳記與備註說明。
