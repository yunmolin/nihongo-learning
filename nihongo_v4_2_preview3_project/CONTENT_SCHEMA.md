# CONTENT_SCHEMA

## 已實作：V4.2第一批資料（schema1）

data/learning-content.json包含words、sentences、grammar、activities、units、unitMap、questionWordLinks。詞條以wordId和senseId識別，例句詞段以UTF-16索引start/end與surface核對；詞義、假名及活用說明均為明確資料，不執行即時AI／自動猜詞。單字、單元及既有題目用ID參照；既有題庫與course資料不改寫，舊課程單字列僅保留相容，新互動使用共用詞庫。

單元地圖demo可試學，in_progress／planned不可開啟。三課沿用既有courseId，填空／排序為獨立activityId；排序使用穩定片段ID，可列明多個有效排列，不以隨機畫面順序當答案。

學習schema2增加可選interactive欄位：schemaVersion=1、favoriteWordIds、reviewWordIds、wordAttempts、activityAttempts。作答包含穩定事件ID、詞／活動ID、模式、答案、結果與時間；與原題庫attempts分開。首次建立欄位前保存原始備份，合併去重且拒絕同ID衝突；舊備份不含此欄位時保留現有互動紀錄。完整備份仍使用schema3；新增進度需以新版程式還原。

本節為已部署的預覽格式；後文較完整的Reading／Audio等仍是未實作設計。所有新內容仍為示範，沒有聲稱獨立人工核准。

更新：2026-11-04。本文件區分現有資料格式與V4.2～V4.4設計需求；未開始的格式只是規劃，不是已部署schema，也不觸發資料升級。

## 現有V4.1

|領域|格式與內容|
|---|---|
|題庫|schema2：穩定題目ID、level、kind、domain、category、topics、可選knowledgePointIds、courseIds、難度、四選項、答案索引、繁中解析、來源／授權、批次、狀態、審核、版本及history|
|課程|schema2：穩定課程ID、目標、單字教學、文法／例句／翻譯、錯誤提醒、questionIds、完成條件、reviewDays、prerequisiteIds、knowledgePointIds、availability|
|知識點與大綱|schema1：穩定知識點ID；N5～N1規劃、課程參照、目標分母、先修；N4～N1為planned|
|學習紀錄|schema2：作答、題目版本與快照、完成課程、續練、收藏及稍後複習；統計依紀錄推導|
|管理與備份|管理schema1：回報與處理歷程、審核事件；完整備份schema3包含學習、題庫、管理，向後支援舊格式|

完整現況見ARCHITECTURE.md及既有資料檔。現有課程的簡易單字列不是未來共用單字庫；本次不修改它們。

## V4.2規劃：先定共用模型再實作

- **Word**：穩定wordId、日文詞形、假名、詞性、明確senseId、繁中詞義、例句ID、發音資產ID及審核狀態。課程與題庫參照wordId／senseId，不重複存整份詞條。
- **Grammar**：穩定grammarId及knowledgePointIds、句型結構、情境、繁中解釋、常見錯誤、例句ID、相關課程／題目ID。填空須有可接受答案與正規化規則；排序須有穩定片段ID及正解排列，不能依介面位置判定。
- **Sentence與TokenMapping**：穩定sentenceId、原文、繁中翻譯、假名提示資料、人工確認的詞位置範圍、表層形／原形、wordId／senseId、活用與助詞資訊。偏移量單位、Unicode正規化及範圍不重疊規則在實作前確定並版本化；對應須能重建原句，不能靠任意切字或AI臆測。
- **Course／Unit**：沿用courseId及知識點ID，新增單字／文法／句子／練習／測驗／複習的參照，包含先修、完成條件、下一課推薦與製作狀態。約20～30個單元按內容調整，不能先建立空白課程假裝開放。
- **Learning**：規劃wordId層級的收藏、熟練度、複習及多模式練習紀錄，與既有題目／課程紀錄分開辨識，升級前備份並保留舊欄位。

同形異義詞以senseId及句中對應區分；活用形與詞典原形分別保存。缺少可靠映射時不提供可點擊解釋。未知、草稿、製作中與已開放狀態必須有明確轉換與發布門檻。

## V4.3規劃

- **Reading**：穩定readingId、分級、文體、句子／段落ID、翻譯、假名提示、可靠單字映射、知識點、courseIds及questionIds；收藏與完成紀錄依readingId保存。
- **AudioAsset**：穩定audioId、檔案路徑、來源／授權、媒體類型、長度、資產版本、驗證結果及審核紀錄，連結稿件與詞／句／聽力題。發布前驗證檔案實際存在且可播放，格式欄位不能取代音檔檢查。
- **LessonAssessment**：課程及知識點ID、題目參照、組卷與完成條件、可用題數；作答保留題目版本。缺題顯示不足，不複製題目湊數。音檔缺失的聽力保持未開放。

## V4.4規劃

以真實作答及完成紀錄推導按課程、題型、知識點的分析；避免維護互相矛盾的累計值。每日目標為獨立設定，與當天安排、完成紀錄及複習排程分離；中斷學習不刪除進度。明確區分候選、經人工審核、已發布及有有效資產的可練習數。

## 未來格式驗收要求

實作時才選定新schema版號並提供遷移。所有參照須存在，ID穩定且唯一、先修無循環、詞義與分詞位置可靠、資產授權及驗證完整、未完成內容不可開放。發布前需格式／參照／語意審核、相關自動測試、實際瀏覽器操作及舊備份還原；本次只記錄，不宣稱上述功能已實作。
