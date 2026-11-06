# ARCHITECTURE

## V4.1預覽2穩定性修復

題目新版本合併會聯集雙方已知歷史與當前舊版，不再以內建基線重建而遺失中間版本；相同版本內容衝突拒絕覆寫。作答attemptId若已存在且內容不同，整批還原失敗，不採最後一筆覆寫。歷史快照、紀錄與續練進度加強驗證。

復原日誌在全部鍵與值驗證完畢前不得寫入；復原或學習資料載入失敗亦鎖住題庫匯入。這些變更不改既有題目／課程內容與儲存schema版號，無資料清除操作。

browser-acceptance.html只供驗收，不納入正式應用執行。內嵌相同建置HTML並在測試副本改用隨機儲存鍵前綴，使用真實DOM與localStorage；測試橋接只存在驗收副本。tools/preview.cjs只服務專案目錄並拒絕隱藏檔案與跨目錄。瀏覽器測試工具存在不代表測試已通過。

## V4.1 補充

`source/management.js`負責無UI依賴的回報、審核轉換、紀錄合併、知識點／大綱驗證、覆蓋率與推薦；`source/v41.js`沿用既有元件加入本機審核與小型學習控制。沒有新框架或外部套件。

`data/knowledge-points.json`定義穩定ID；舊題依級別／題型／細分類映射，毋須修改原題，新編輯題可明確指定knowledgePointIds。課程共用同一ID。`data/syllabus.json`保留N5～N1大綱，N4～N1為planned；課程schema2新增prerequisiteIds、knowledgePointIds、availability與擴充欄位。

`nihongo-management-v41`獨立儲存schema1的reports與reviewEvents。回報保留原題版本與題幹；操作追加歷程。題目reviewRecords保留人工核准，reviewEvents追蹤管理操作，匯入後者不自動發布內容。

內容修改增加版本；同內容版本的狀態變更追加紀錄。相同版本合併只接受可延伸的歷程前綴；舊備份略過，分歧拒絕，避免抹去最新審核。作答快照保持原內容。

favoriteIds及laterReviewIds是學習schema2的可選欄位，還原採聯集。完整備份schema3新增management，向後支援schema1／2完整備份與獨立紀錄。整批驗證後以交易保護三個儲存鍵。

重要題庫／管理／還原操作前，`nihongo-v41-safety`保存最近3份原始三鍵快照；備份失敗即拒絕修改。此格式為保全用途，非一般匯入格式。localStorage容量有限，仍需定期下載完整JSON；本機沒有正式權限驗證。

## 延續 V3

保留原 V3 HTML 架構、CSS 與分類介面。`source/v3-compat.js` 保留既有課程、語音、統計與練習篩選等邏輯；`source/app.js` 只擴充需要修復的作答、版本、備份、課程與續練功能。未改用框架或外部服務。

## 分離的資料

|檔案／儲存|責任|
|---|---|
|data/question-bank.json|schema 2 題庫；分類、主題、課程ID、難度、選項、解析、狀態、授權、批次、版本與審核|
|data/courses.json|schema 1 課程：目標、單字、教學、例句翻譯、錯誤提醒、題目ID、完成與複習規則|
|data/kana.json|平片假名字卡及補充教學|
|source/core.js|不依賴介面的驗證、升級、版本合併、SRS、交易復原|
|source/storage.js|學習與題庫的分別儲存、舊資料保存、損壞鎖寫與提示|
|nihongo-learning-v4|schema 2 個人作答、完成課程、時間、續練位置；無會員或付款資料|
|nihongo-bank-v4|schema 2 使用者新增題目及內建題修訂；與學習紀錄分開|
|nihongo-v4-transaction|還原前的交易日誌；部分寫入失敗時回復，重新開啟先復原|

會員／訂單領域目前未實作，沒有將其混入學習資料。未來須建立獨立伺服器資料模型與權限，不能靠前端旗標收費。

## 單檔與專案來源

`tools/build.cjs` 將 JSON 放入 `application/json` 資料區塊，並內嵌程式與 CSS 產生 index.html；避免 file:// 的 fetch 限制。這是產出檔，內容來源仍與 UI 分離。單檔不需外部套件、字型或網路。實際離線瀏覽器驗證尚未完成。

## 版本和紀錄

每個題目有穩定 ID 與遞增 version。匯入先做整批驗證及版本合併預覽；同版本不同內容整批拒絕，同內容略過，新版保存舊題到 history。新版須重新審核，不能繼承舊版核准。

新作答記錄包含 attemptId、id、questionVersion、selectedAnswer、correct、time、snapshot 與可選 courseId。snapshot 保留當時題目，不因後來更新而失真；舊紀錄無版本／快照者明確標示，不推定其歷史內容。正確率、錯誤次數、最近練習、熟練度、複習日期及今日任務由歷史紀錄推導，避免重複維護多份統計。

續練保存題單、進度、洗牌後選項、已答結果與課程 ID；重開後不得再次增加已作答那題的紀錄。這已通過序列化／重載自動檢查，尚未通過真實關閉瀏覽器測試。

## 審核和試做

新內容一律草稿或待審核。只有 published 可進正式練習；原 V3 題以 legacyDemo 保留示範試做。聽力播放尚未提供，因此全部聽力均排除練習。approved／published 需同版本人工審核及授權；此本機 JSON 流程不能證明人員身分，正式後台須改由伺服器驗證。

## 遷移與失敗

先嘗試復原待處理交易，再讀新版資料；新版不存在時，讀取並驗證舊 V2／V3、保留原始字串，再寫入新版鍵。舊鍵保持不動。學習／題庫損壞時分別鎖寫，保留原資料並顯示提示，不能以空資料覆蓋損壞來源。

還原先驗證所有題目與紀錄，再計算合併結果，最後以交易日誌保護兩個獨立鍵。localStorage 不是正式資料庫，瀏覽器關閉中途崩潰的可靠性仍有限；需定期下載 JSON 備份。正式同步與會員化時應使用伺服器交易儲存。
