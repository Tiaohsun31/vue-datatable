# v3 重構決策紀錄（Architecture Decision Record）

> **這是 `@tiaohsun/vue-datatable` v3 重構的歷史決策紀錄，非現行待辦清單。**
> 保留下來是為了記錄「為什麼這樣設計」，供維護者與貢獻者參考；文中的勾選框與階段狀態反映的是重構當時的進度（v3.0.0 已完成發佈）。後續規劃請見 [ROADMAP](./ROADMAP.md)。
>
> 重構範圍：2.3.2 → 3.0.0（允許合理破壞性變更）。來源：fork 自 [vue3-easy-data-table](https://github.com/HC200ok/vue3-easy-data-table)（MIT），改用 Tailwind 4。發佈時套件由 `@tiaohsun/vue-datatable-tailwind` 改名為 `@tiaohsun/vue-datatable`。

---

## 0. 背景與總目標

專案分層方向正確（`DataTable.vue` 協調 + composables 邏輯 + 元件 UI），但有三類問題要一次清掉：
1. **主題系統過度工程化**（themeManager 單例 + setTimeout + DOM 偵測 + 280 行手刻顏色轉換）。
2. **CSS 混血亂局**（template 撒 utility + 另外手刻 300 行假 utility CSS），導致 README 的 `!important` workaround。
3. **資料識別脆弱**（全靠 `JSON.stringify` 比對，且會改動使用者的 item 物件）。

總目標：結構清晰、樣式可維護、行為可預期、對外可用穩定 class hook 覆蓋、**使用者免裝 Tailwind**。

破壞性變更接受度：**可接受合理破壞**，集中在 v3，文件需附 migration 說明。

---

## 1. 已定案決策（含理由）

### 決策 1：主題顏色 — 單一主色 + `color-mix()` 衍生
- 元件實際只用到 primary 的 `100 / 300 / 500 / 600 / 800` + `500/50`，其餘 6 階是 dead weight。
- 改為**唯一輸入** `--color-vdt-primary`，其餘狀態用 `color-mix()` 在 CSS 衍生。
- 使用者傳什麼色就用什麼色（**取消「吸附最近 Tailwind 色」**）。
- 因 `color-mix()` 吃任意 CSS 顏色（hex/rgb/oklch），**不需要任何顏色轉換** → 刪掉 `colorUtils.ts` 絕大部分。
- 色名（如 `indigo`）非 CSS 原生色名，需小對照表 → `tailwind4-color.ts` 從 291 行縮成「色名 → 單一 base 值」約 22 行。
- hover 用**混黑加深**（`color-mix(... black 12%)`）而非透明度（彩色疊透明在不同底色會糊）。
- 前提：`color-mix()` = Baseline 2023，與 Tailwind 4 既有需求一致，無新增瀏覽器限制。

### 決策 2：CSS 出貨 — 純預編譯、移除 tailwindcss peerDependency
- runtime 換色 = 改一個 CSS 變數，不需重新生成 class，故可純出貨自包含 CSS。
- 使用者**不需安裝 Tailwind**，`import '.../style.css'` 即可。
- 鐵則：出貨 CSS 不可引用 consumer Tailwind theme 的變數；自訂 `--vdt-*` 命名空間 token 或 inline 字面值。

### 決策 3：項目識別 — 新增 `itemKey` prop
- 新增 `itemKey?: string`（指定唯一欄位，如 `'id'`）；未傳則 fallback（優先 `item.key`，否則穩定 index）。
- 選取狀態改用 `Set<key>` 管理，render 時查表；**不再 `delete item.checkbox / item.index` 改動使用者資料**。
- 移除所有 `JSON.stringify` 身分比對（展開、選取、分頁快取、批次選取）。

### 決策 4：泛型 `DataTable<T>` — 本輪延後
- DX 加分但與其他項獨立，硬塞會拉長戰線。留待 v3 之後增量。

### 決策 5：composable 接線 — 改 options 物件 + 聚合
- 長位置參數串（`useHeaders` 21 個位置參數）→ 改傳單一 options 物件（介面 `HeadersConfig`/`ReactiveHeadersConfig` 已存在卻沒用）。
- 內部接線收斂到 `useDataTable(props, emit)`，`DataTable.vue` 瘦成薄協調層。

### 決策 CSS 架構：採 (II) 語義 component class
- 樣式收進 `.vdt-*` class，用 Tailwind 4 token 撰寫（`padding: --spacing(3) --spacing(4); font-size: var(--text-sm);`）。
- README 早已宣傳的 13 個 `.vdt-*` hook（目前全空）→ 變成真的可覆蓋表面，移除 `!important` workaround。
- 代價：逐元件把 template utility 搬進 CSS，是本輪最大工程塊；但元件庫樣式表面有限，一次寫好長期受益。

### 決策 6：搜尋預設改「子字串包含」（行為變更，影響極小）
- 純文字搜尋 contains 與 regex 結果相同；差異只在使用者打正則特殊字元，屬罕見進階用法。
- 改 contains 同時修掉特殊字元 crash。保留 `searchType: 'contains' | 'regex'` 逃生門，預設 `'contains'`。
- 與 Phase 0 的 regex bug 修復合併（同一行）。

### 決策 7：捨棄批次選取（移除功能 + prop）
- `useBatchSelection`(178行) + 進度遮罩 + `useTotalItems` 雙路徑，維護成本高而 99% 使用者不觸發。
- 刪 `src/composables/useBatchSelection.ts`、`src/components/loadings/SelectionLoadingOverlay.vue`。
- 移除 `batchSelectionThreshold` prop 與其 default、`isProcessing`/`processProgress`、`updateSelectionStatus` 事件。
- 併入 Phase 2（選取重寫時一起，避免先重寫批次路徑又刪掉）。

### 決策 8：新增簡易 i18n（內建 en / zh-TW / zh-CN，可擴充）
- 內建三語系 locale 包；使用者可：(a) `locale` 選內建、(b) `localeOverrides` 覆蓋個別字串、(c) 傳完整自訂 locale 物件支援未內建語言。
- **既有 message props 仍可用且優先序最高**（向後相容，現有使用者不破）。
- 解析序：個別 message prop > `localeOverrides` > 內建 `locale` 包。透過 inject 提供，順帶消除 `rowsPerPageMessage`/`rowsOfPageSeparatorMessage` 的 prop-drilling。
- 併入 Phase 1（template 已全開，避免二次改動）；見 Phase 1.5。

### 決策 9（3.1.0 追記）：重新引入水平溢出偵測 — 有實際使用者，改為正式 API
> v3.0.0 之後的追加決策。Phase 0（見下方「死碼 / 殘留清理」）曾刪除舊的 `hasHorizontalScroll`；本決策說明為何重新引入、以及與舊實作的差異。

**為什麼當初刪、現在又加回來**
- 當初刪除的理由是「沒有使用者」：`hasHorizontalScroll` 唯一讀取點在註解碼，整段含 `MutationObserver` 的偵測是空轉，且 `onUnmounted` 還誤寫成 `addEventListener`（監聽器洩漏）。
- 現在有實際使用者：eShop CMS 的 7 個列表頁在 1024px 寬度時表格水平溢出，最右側操作欄被捲到畫面外。使用端自寫 `useTableScrollRegion`，以 `querySelector('.vdt-table-container')` 抓**套件內部 class** 比對 `scrollWidth` / `clientWidth`，再讓外層 div 可聚焦並攔截方向鍵 `scrollBy`。依賴內部 DOM 結構是脆弱的耦合，應由套件提供正式、可測試的 API。

**與舊實作的差異**

| 面向 | 舊 `hasHorizontalScroll`（≤ 2.3.2，已刪） | 新 `hasHorizontalOverflow`（3.1.0） |
| --- | --- | --- |
| 觸發來源 | `MutationObserver`（任何 DOM 變動）+ `window` resize | `ResizeObserver` 觀察**容器與 `<table>`** + 容器 scroll + items / headers / 分頁變動後 `nextTick`；不用 `MutationObserver`（變動過於頻繁且與尺寸無直接關係） |
| 對外 | 無（讀取點在註解碼） | `defineExpose` 唯讀 ref + `update:hasHorizontalOverflow` 事件 + `scrollRegionLabel` / `showScrollHint` / `scroll-hint` slot |
| 可及性 | 無 | 溢出時才加 `tabindex="0"` / `role="region"` / `aria-label`（未溢出不加，避免多餘 Tab 停留點）、`aria-describedby` 提示列、`:focus-visible` 外框 |
| 陰影 | 左右共用 `scrollLeft > 0`（右側時機錯） | 左 `scrollLeft > 0`、右 `scrollLeft + clientWidth < scrollWidth - 1`，scroll 與 resize 都重算 |
| 清理 / 環境 | `removeEventListener` 寫錯 | `onUnmounted` 統一 `disconnect` / 移除監聽；SSR 不執行、無 `ResizeObserver` 退回 `window` resize |
| 位置 | 散在 `DataTable.vue` | 獨立 `composables/useHorizontalScroll.ts`（溢出與固定欄無關，沒有固定欄也需要）；`useFixedColumn` 回歸純位置計算，捲動監聽只保留一份 |

**鍵盤：不攔截按鍵**
- 實測（Chromium，CDP 送出帶 virtual key code 的真實按鍵，並以頁面 ArrowDown 捲動作為對照組）：焦點在捲動容器本身時，原生 ArrowLeft / ArrowRight 即可左右捲動（每次約 40px）；表格內輸入框的方向鍵只移動游標、可排序表頭 Enter 仍正常排序。故不自行處理 keydown。
- 使用端舊寫法需要攔截，是因為聚焦的是**外層 div**（不是捲動元素本身），瀏覽器不會替它捲動內層容器。
- Firefox 本機未安裝，未實測；若日後發現原生行為不足，再補「只處理 `event.target === 容器`」的 ArrowLeft / ArrowRight。

**其他取捨**
- `DataTableLocale.horizontalScrollHint` 設為選填：設必填會讓自行建立完整 `DataTableLocale` 物件的使用端在升級後型別檢查失敗（型別層破壞性變更）。
- `.vdt-table-wrapper` 改直向 flex：才能在固定高度 flex 版面中讓容器吃剩餘高度並自行捲動。未限制高度時與 block 排版結果相同（playground 於 1280px / 768px 量測 wrapper / container / footer 尺寸一致）。
- 提示列 id 以模組層計數器產生（不用 `useId`，維持 `vue ^3.4` peer）；只在掛載後溢出時渲染，SSR 無 hydration 不一致。

---

## 2. 分階段任務（低風險優先）

> 每個 phase 結束都應 `pnpm type-check` + `pnpm build` 通過，並以 playground（`pnpm dev`）手動驗證。
> （重構期間 playground 曾被 .gitignore，後於 Phase 5 納入版控。）

### Phase 0 — 清理與明確 Bug 修復（風險最低，先做）

> ✅ **已完成（type-check + build 通過）**。註：`updateFilter` 事件從未觸發，已從 emits/EmitsEventName 移除（屬無害的公開 API 清理）。
> onMounted 的 `removeEventListener` bug 連同整個空轉的水平捲動偵測（含 MutationObserver）一併刪除，故該 bug 自然消失。

**Bug 修復：**
- [ ] `src/DataTable.vue:690` — `onUnmounted` 內 `window.addEventListener('resize', ...)` 應為 `removeEventListener`（監聽器洩漏）。
- [ ] `src/components/table/TableBodyCell.vue:113` — `handleCellClick` 用裸 `event`，改從參數接收 `MouseEvent`。
- [ ] `src/utils/colorUtils.ts:236,239` — 移除 `console.log`（此檔 Phase 1 多半會刪，但先清）。
- [ ] `src/DataTable.vue:215` — 移除 `withDefaults` 裡不存在於 `DataTableProps` 的 `instanceTheme: false`。
- [ ] `src/composables/useTotalItems.ts:49` — **搜尋預設改子字串包含**（取代未跳脫的 `new RegExp`，同時修掉特殊字元 throw 的 crash）。新增 `searchType?: 'contains' | 'regex'` prop，預設 `'contains'`；`'regex'` 時才用 RegExp（仍須 try/catch 包住避免 throw）。比對維持 case-insensitive。
- [ ] `src/composables/useServerOptions.ts:48-60` — 直接 `serverOptionsComputed.value.sortBy.push/splice` 就地改 props/computed 回傳物件；改為產生新物件再 set。
- [ ] `src/components/table/TableBodyCell.vue:9-10` — 移除重複巢狀的 `<template v-if="column === 'checkbox'">`。

**死碼 / 殘留清理：**
- [ ] `src/composables/useTotalItems.ts:10` — 未使用的 `BATCH_SELECTION_THRESHOLD` 常數。
- [ ] `src/composables/useTotalItems.ts:192` — `shouldUseBatchSelection` 內 `isServerSideMode ? …` 前已 `return false` 的死分支。
- [ ] `src/components/table/TableFooter.vue:111-134` — 未使用的 `rowsPerPageSlotProps`/`paginationInfoSlotProps`/`paginationSlotProps` computed。
- [ ] `src/DataTable.vue:558-563,665-694` — `hasHorizontalScroll` 唯一讀取點在註解碼（:578），整個含 `MutationObserver` 的偵測是空轉，刪除（陰影改由 `useFixedColumn` 負責）。**→ 3.1.0 因有實際使用者而以 `ResizeObserver` 重新引入，見決策 9。**
- [ ] 清掉大段註解碼：`src/types/main.ts:299-397`、`useTotalItems.ts:137-157,268-299`、`themeManager.ts:209-212` 等。
- [ ] 刪除失效檔 `src/types/vue-datatable-tailwind.d.ts`（宣告模組名 `vue-datatable-tailwind` 與發佈名不符，相對路徑無法從消費端解析，無人引用）。
- [ ] `src/index.ts:1` — import 路徑 `'../src/styles/theme.css'` 改 `'./styles/theme.css'`。
- [ ] `package.json` — `files` 移除不存在的 `"types"`；新增 `"sideEffects": ["**/*.css"]`（避免 CSS 被 tree-shake）。
- [ ] `emits` 與 `EmitsEventName` 對齊：`updateFilter` 在型別/陣列有但實際被註解掉沒 emit，決定要嘛接回要嘛移除宣告。

### Phase 1 — 主題系統重寫 + CSS 語義 class + packaging（最大塊）

> **執行分兩階段：**
> - ✅ **1a 主題引擎（已完成，type-check + build 通過，dist CSS 確認自包含）**：token 模型、useTheme 響應式重寫、刪 themeManager/colorUtils、縮 tailwind4-color、repoint+slim tailwind.utilities.css、移除 tailwind peer。JS 81.9→64.6 kB。
> - 🟡 **1b 進行中**：
>   - ✅ **深色模式全面校正完成**：所有硬寫 `gray`/`dark:` 已換語義 token（TableHeaderCell/TableHeader/TableExpandRow/RowsPerPageSelector/BaseCheckbox/LoadingLine/ButtonsPagination 死碼/DataTable loading 遮罩）。新增橋接 class：`.bg-vdt-interactive-active`/`.bg-vdt-overlay`/`.ring-vdt-outline`/`.hover:border-vdt-outline-strong`，修正 `.divide-vdt-outline` 子選擇器。build 通過。
>   - 🟡 **`.vdt-*` hook class 結構化（進行中）**：
>     - ✅ 已建 `src/styles/components.css`（自包含字面 CSS + token），theme.css 已 import。
>     - ✅ **核心表格結構 hook 已遷移並驗證**（computed-style light+dark 皆正確、build 自包含）：`.vdt-table-wrapper/-container/-table/-thead(+--sticky)/-thead-th(+--sortable/--sorted)/-tbody/-tbody-tr/-tbody-td/-expand-row/-loading-overlay/-empty`。對應模板靜態 utility 已移除。
>     - ✅ **主要子元件已遷移並驗證**（computed-style + 截圖）：TableFooter(響應式 mobile/desktop)、PaginationArrows、PaginationInfo、ButtonsPagination、RowsPerPageSelector(含下拉，順修 click-outside 依賴 `.relative` 的 bug→改 `.vdt-rows-select-wrap`)、BaseCheckbox(`.vdt-checkbox*`)、Loading/LoadingLine(scoped style)、TableHeaderCell 排序徽章、TableBodyCell expand 按鈕、TableExpandRow grid 過渡。全部 `.vdt-*` 自包含字面 CSS，build 通過。
>     - ✅ **長尾版面 utility 已全部收斂**：TableBodyRow 邊框→`.vdt-tbody-tr--border-cell/--border-row`、TableBodyCell `cursor-pointer`→`--clickable`、容器 shadow→`--shadow`、loading inner→`__inner`、fixed-column shadow→`--fixed-left/right`、Transition→`name="vdt-fade"`、**全部 icon**（sort/expand/ellipsis/prev/next）→`.vdt-icon*`、expand-row `border-t`→`--bordered`、`.vdt-expand-btn` 加 button reset（無 preflight 時的原生按鈕框）。
>     - ✅ **trim**：`tailwind.utilities.css` 移除約 150 行已無人使用的橋接 class，只留 `bg-vdt-surface`/`bg-vdt-surface-secondary`/`hover:bg-vdt-interactive-hover`（TableBodyRow 條件綁定）+ fixed-column + scrollbar。
>     - ✅ **最終驗證（決定性）**：playground 暫時停用 `@import "tailwindcss"` 後截圖 → DataTable（含表頭/列/checkbox/footer/分頁/**展開列+旋轉箭頭+邊框**）完全正常渲染，僅 playground 自身 chrome 失去樣式。**證明 dist CSS 真正自包含、1a 的 tailwindcss peer 移除正式成立**。
>     - ⬜ 唯一殘留 `SelectionLoadingOverlay.vue` 仍有硬寫 utility/灰階 → 由 **Phase 2** 刪除該檔時一併解決。
>   - ⬜ **on-primary 白色**（checkbox 勾、主色按鈕文字）維持 `text-white`，可選擇改 `--color-vdt-on-primary`。
>   - ⬜ **checkbox focus ring**（`peer-focus:ring-vdt-primary-500/50`）variant 未定義，hook 化時一併處理。

**主題 token 模型（寫進 `src/styles/theme.css`）：** ✅ 1a 完成
- [ ] 定義唯一輸入 `--color-vdt-primary`（預設 indigo 的 oklch）。
- [ ] 衍生狀態：
  ```css
  --color-vdt-primary-hover:  color-mix(in oklch, var(--color-vdt-primary), black 12%);   /* 取代 600 */
  --color-vdt-primary-subtle: color-mix(in oklch, var(--color-vdt-primary), var(--color-vdt-surface) 88%); /* 取代 100 */
  --color-vdt-primary-ring:   color-mix(in oklch, var(--color-vdt-primary), transparent 50%); /* 取代 500/50 */
  --color-vdt-on-primary:     white;
  ```
  （原 300 淡邊框、800 文字色亦由 primary 衍生或併入既有語義 token。）
- [ ] 保留既有中性語義 token（surface / content / outline / interactive，含 `[data-vdt-mode]` 深淺切換）——這套設計是好的。
- [ ] 定義自包含 `--vdt-*` 設計 token（spacing/text/radius/font）或確認 build 後 CSS 無外部變數相依。

**移除舊主題機制：**
- [ ] 刪除 `src/utils/themeManager.ts`（383 行單例）。
- [ ] 刪除 `src/utils/colorUtils.ts` 大部分；若色名仍需，留最小 helper。
- [ ] `src/utils/tailwind4-color.ts` 縮為「色名 → 單一 base oklch」對照（約 22 行）。
- [ ] 重寫 `src/composables/useTheme.ts`：移除 setTimeout/querySelector/getComputedStyle/訂閱；改為解析輸入色 → 回傳 `computed` 給 `DataTable.vue` 用 `:style="{ '--color-vdt-primary': resolved }"` 綁定。
  - 解析規則：色名 → 查表；hex/rgb/oklch → 原樣 pass-through。
  - 深淺模式：`mode` prop → 綁 `data-vdt-mode`；未給走 auto（`prefers-color-scheme`，可用 `matchMedia` 或純 CSS `@media`）。
- [ ] `DataTable.vue` 移除 `watch(theme)` / `watch(mode)` 的命令式呼叫，改宣告式綁定。

**CSS 語義 class（採 (II)）：** ⬜ 1b 待辦

> **Phase 1b 已知待修點（1a 過程中發現的潛在問題，移到 .vdt-* class 時一併處理）：**
> - 多處硬寫 `dark:` variant（依賴全域 `.dark`）：`DataTable.vue` loading 遮罩 `bg-white/50 dark:bg-black/50`、`RowsPerPageSelector.vue` 的 `ring-gray-200 dark:ring-gray-700`、`TableHeader.vue` 的 `divide-gray-300 dark:divide-gray-600`、`TableHeaderCell.vue` 的 `bg-gray-200 dark:bg-gray-700` 等 → 全改語義 token。
> - 既有 hand-written utility 有缺漏（部分 class 其實沒生效）：`peer-focus:ring-vdt-primary-500/50`（BaseCheckbox 的 focus ring 色）原本未定義 variant；`hover:text-vdt-content`、`hover:bg-vdt-surface` 1a 已補上。移到 .vdt-* 後這些 edge case 自然消失。
> - 移到 .vdt-* 後可移除出貨 CSS 中的泛用 Tailwind utility（`.flex`/`.px-4` 等），避免與使用者全域樣式衝突，達到真正乾淨的自包含。
- [ ] 刪除 `src/styles/tailwind.utilities.css`（300+ 行手刻假 utility）。
- [ ] 為每個 `.vdt-*` hook 撰寫實際樣式（`.vdt-table-wrapper / -container / -table / -thead / -thead-tr / -thead-th / -tbody / -tbody-tr / -tbody-td / -expand-row / -footer / -pagination`），用 Tailwind 4 token 函式。
- [ ] 逐元件把 template 的 utility 搬進對應 `.vdt-*` class（template 僅保留結構性/狀態性 class）。
- [ ] **修深色模式 bug**：`TableHeaderCell.vue:4`、`TableHeader.vue:8` 的硬寫 `bg-gray-200 dark:bg-gray-700` / `divide-gray-*` 改用 `--color-vdt-*` 語義 token（現況：`mode="dark"` 但無全域 `.dark` 時表頭不變深色）。
- [ ] 統一固定列陰影邏輯到 `useFixedColumn`（Phase 0 已刪 DataTable 的重複偵測）。

**Packaging：**
- ⚠️ **重要發現**：目前 dist CSS **不含** Tailwind 版面 utility（`px-4`/`flex` 等），元件實際依賴**使用者的 Tailwind**（README `@source`）來生成版面。因此：
  - 1a 已移除 `tailwindcss` peer，但**在 `.vdt-*` hook 結構化（含 `@apply` 自包含）完成前，此移除尚未真正成立**——沒裝 Tailwind 的使用者目前會缺版面。
  - 自包含目標的正解：模板只用 `.vdt-*`（+狀態 class），`.vdt-*` CSS 以 `@apply` 撰寫，build 時 Tailwind 把屬性 inline 進出貨 CSS → 無泛用 utility 污染、真正自包含。完成後 peer 移除才生效。
- [x] `package.json` 移除 `tailwindcss` 的 `peerDependencies`（保留 `vue`）— 已移除，待自包含完成後生效。
- [ ] build 後檢查 `dist/vue-datatable-tailwind.css` 為自包含（grep 不應殘留 consumer-only 變數）。
- [ ] 更新 README：移除 `@source` / tailwind.config 掃描指引與 `!important` workaround；改為「import style.css 即可，免裝 Tailwind」。

### Phase 1.5 — i18n ✅ 完成（build + playground 三語系驗證）

> 驗證：zh-TW → 「每頁筆數：」/「1–5 / 12」/ 空資料「無可用資料」皆正確。`DataTableLocale`/`LocaleName`/`locales` 已從 index.ts 匯出。移除了 `emptyMessage`/`rowsPerPageMessage`/`rowsOfPageSeparatorMessage` 的 withDefaults 預設（改由 locale 提供；en 預設值與舊版相同→現有英文使用者無感）。

- [x] 新增 `src/i18n/`：`DataTableLocale` 型別 + 內建 `en` / `zh-TW` / `zh-CN` 三包。
  ```ts
  interface DataTableLocale {
    emptyMessage: string          // 'No Available Data'
    rowsPerPageMessage: string    // 'rows per page:'
    rowsOfPageSeparatorMessage: string // 'of'
    loading?: string
  }
  ```
- [ ] `DataTableProps` 新增 `locale?: 'en' | 'zh-TW' | 'zh-CN'`（預設 `'en'`）與 `localeOverrides?: Partial<DataTableLocale> | DataTableLocale`（後者支援未內建語言）。
- [ ] `DataTable.vue` 算出 `messages` computed：`{ ...內建[locale], ...localeOverrides, ...(若有設個別 message prop 則覆蓋) }`，用 `provide(localeKey, messages)`。
- [ ] `PaginationInfo.vue` / `RowsPerPageSelector.vue` / `DataTable.vue` 空資料區改 `inject` 讀 `messages`，取代硬編碼字串與 prop-drilling。
- [ ] 保留 `emptyMessage` / `rowsPerPageMessage` / `rowsOfPageSeparatorMessage` props 為最高優先（向後相容）。

### Phase 2 — 項目識別與選取解耦 ✅ 完成（playground 全功能驗證）

> 驗證：itemKey 快速路徑（`item-key="email"`）+ 內容 fallback、單選/全選/跨頁持久/取消選取→indeterminate 表頭、展開，皆正確。build clean、JS 51 kB。批次移除也清掉 1b 唯一殘留（SelectionLoadingOverlay 硬寫灰階）→ 1b 100% 無殘留。

- [x] **先移除批次選取**（決策 7）：刪 `useBatchSelection.ts`、`SelectionLoadingOverlay.vue`；`useTotalItems` 移除雙路徑/`isProcessing`/`processProgress`；`DataTable` 移除引用、`batchSelectionThreshold` prop、`updateSelectionStatus` 事件；`internal.d.ts` 移除該事件型別。
- [x] `DataTableProps` 新增 `itemKey?: string`。
- [ ] 新增 `src/utils/itemKey.ts`：`getItemKey(item, itemKey?, index?)` — 優先 `item[itemKey]` → `item.key` → 穩定 index。
- [ ] `useTotalItems.ts` 選取邏輯：改 `Set<key>` + 查表；移除 `delete item.checkbox/index`、移除 `JSON.stringify` 過濾。
- [ ] `usePageItems.ts`：移除 `PageCacheManager` 的 `JSON.stringify` key，改用 `getItemKey`；選取狀態用查表而非把 `checkbox` 灌進 item 複本（或至少集中於一處）。
- [ ] `useExpandableRow.ts:24`：用 `getItemKey` 取代 `JSON.stringify` 比對。
- [ ] `useBatchSelection.ts:17-25`：`getItemKey` 統一。
- [ ] `useClickRow.ts`：`prepareRowEventData` 改為不依賴 item 上被灌入的 `checkbox/index`。
- [ ] 行為驗證：選取（單/全/批次）、跨頁選取、展開、disabledRows 互動。

### Phase 3 — composable 接線重構 ✅ 完成（型別檢查 + sort 執行驗證）

> 決策：**不做 useDataTable 聚合器、不移動 DataTable.vue 位置**（聚合器高 churn、會藏起資料流，對此規模屬過度設計；options 物件化已取得主要可維護性效益）。

- [x] **全部 9 個 composable 改 options 物件傳參**（useHeaders/useTotalItems/usePageItems/usePagination/useRows/useServerOptions/useClickRow/useExpandableRow/useFixedColumn），各 export `UseXxxOptions` 介面；DataTable 呼叫端改具名物件。型別檢查保證鍵名正確。
- [x] **修正多鍵排序**：`recursionMuiltSort`（重複 sort）→ `multiSortComparator` 依序比較欄位、單次 `.sort()`、O(n log n)。
- [x] **`provide('dataTable')` → 具型別 `InjectionKey`**（新增 `src/keys.ts` 的 `dataTableKey`）。順手把 `useServerOptions` 的 `Ref<Boolean>` 修為 `Ref<boolean>`。
- [~] ~~useDataTable 聚合器 / 移動檔案位置~~：依決策略過。

### Phase 4 — 型別與 DX（不含泛型）✅ 完成（build + v-model 驗證）

> 泛型 `DataTable<T>` 仍依決策延後。

- [x] **typed `defineEmits<DataTableEmits>()`**：在 internal.d.ts 新增 `DataTableEmits`（payload 映射）+ `DataTableEmitFn`；`EmitsEventName = keyof DataTableEmits`（避免漂移）；5 個 composable 的 emit 參數改 `DataTableEmitFn`（emit 呼叫現受 payload 型別檢查）。v-model:items-selected 驗證正常（type-only defineEmits 編譯期生成 runtime emits）。
- [x] **`defineSlots<DataTableSlots>()`** 接上 `src/types/slot.ts`。
- [x] **型別收斂**：`HeaderForRender = Header`（結構一致，移除重複定義）；`ServerOptionsComputed = Omit<ServerOptions,'sortBy'|'sortType'> & {...}`（由 ServerOptions 衍生）。
- [x] **`Item.key` 文件**：註明與 `itemKey` prop 的關係（getItemKey 優先序）。

### Phase 5 — 測試、文件、發佈 ✅ 完成

- [x] **單元測試（0 → 27 測試 / 5 檔，全綠）**：`getItemValue`（巢狀路徑）、`getItemKey`/`omitUiFields`、filter type-guards + `createFilter`、`resolvePrimaryColor`、`DataTable` 排序（單/多鍵 component test）。位置 `src/**/__tests__/`。以 `npx vitest run` 執行。
- [x] **無障礙**：可排序表頭 `aria-sort` + `tabindex`/Enter/Space 鍵盤；展開鈕 `aria-expanded`/`aria-label`；全選 `indeterminate` + `aria-checked="mixed"`。playground eval 驗證。
- [x] **CHANGELOG 3.0.0**（breaking / features / fixes）、**bump `package.json` 3.0.0**、README 安裝段修正（移除已失效的 `@source`/Tailwind 需求、指向 CHANGELOG migration）。
- [x] `npm pack` 驗證：版本 3.0.0、CSS 18.3kB 一併打包。
- [x] **playground 入庫**：移出 `.gitignore`，`playground/{App.vue,main.ts,style.css}` 納入版控；import 改用公開入口 `../src/index`；不影響 npm 發佈（`files: ["dist"]`）。
- [x] **dts 型別產生（plugin-less，最終方案）**：依使用者決定**移除 `vite-plugin-dts` + `@microsoft/api-extractor`**，改與其他專案一致 —— 由 `vue-tsc` 產逐檔 `.d.ts`。
  - 診斷過程記錄：`vite-plugin-dts@5` 實為 `unplugin-dts` 薄殼，bundling 選項是 `bundleTypes`（非舊 `rollupTypes`，舊名被忽略）且需 api-extractor；曾以此成功打包單一 index.d.ts，但 api-extractor 內建 TS 5.9.3 < 專案 6.0.3 會印警告，且多一個重依賴 → 改走 plugin-less。
  - 做法：新增 `tsconfig.build.json`（`extends ./tsconfig.json`，覆寫 `noEmit:false`/`emitDeclarationOnly`/`outDir:dist`/`rootDir:src`/`composite:false`/`declarationMap:false`）；`build:types` 改 `vue-tsc -p tsconfig.build.json`；`build` 改 `run-p type-check build-only && npm run build:types`（型別在 vite 之後 emit，避開 emptyOutDir race）。
  - 同時清掉 dead config：`tsconfig.json` 移除 `declaration/declarationDir/outDir/declarationMap`（改純 type-check，`noEmit` 繼承自 @vue/tsconfig）與失效的 `types/**` include；vite.config 加 `copyPublicDir:false`（不再把 favicon 打進包）。
  - 結果：`rootDir:src` 使 `src/index.ts → dist/index.d.ts`（對映 package.json `types`）；逐檔 `.d.ts`（42 檔）；消費端 tsc 驗證公開型別可解析、`TailwindColor` union 未塌成 string；npm pack 49 檔、無 favicon、無 `.d.ts.map`。build < 1s。
- [x] **README（中英）v3 同步**：兩版皆更新 —— 版本說明（v3 免裝 Tailwind）、v3 重點區、Install（中文移除舊 `@source`/tailwind.config 指引）、Theme（50–950 色階 → 單一 `--color-vdt-primary`+color-mix）、自訂樣式段（移除 `!important` workaround 框架，改為直接覆寫 `.vdt-*`/`--color-vdt-*`/`--vdt-*`）、Props 表（移除 `batchSelectionThreshold`，新增 `itemKey`/`mode`/`searchType`/`locale`/`localeOverrides`）。

**發佈前補充（v3.0.0 前）：**
- [x] **docs/api 檢視與補充**：修正 `filterOptions.md` 的 `createFilter` import 路徑（→ 套件根）；新增 `docs/api/theme.md`、`i18n.md`、`itemKey.md`；README（中英）加上 API 文件索引。
- [x] **`selection-checkbox` slot 新增 `isSelected` slot prop**（消費端不需再讀內部 `item.checkbox`）；slot.ts 型別 + TableBodyCell v-bind + slot.md + CHANGELOG 同步。
- [x] **package.json metadata 補強**：description 改「自包含 / 免裝 Tailwind」、新增 `homepage`/`bugs`/`publishConfig.access=public`、擴充 keywords。publish dry-run 乾淨（49 檔、latest、public）。
- [x] **本計畫書移至 `docs/REFACTOR_PLAN.md`**（v3 完成後，作為決策/歷史紀錄保留，移出 repo 根目錄）。
- 命名決策（更新）：**改名為 `@tiaohsun/vue-datatable`**。原評估傾向保留，但補充考量後翻轉：(1) 姊妹套件 `@tiaohsun/vue-datepicker` 無後綴，形成 `@tiaohsun/vue-*` 家族；(2) `@tiaohsun/vue-datatable` 名稱未被佔用；(3) v3 尚未發佈，現在改是乾淨切點、無 3.x 使用者要遷移；(4) v3 真的免 Tailwind，後綴名實不符。做法：package.json `name` + CSS 檔名（`dist/vue-datatable.css`，vite `cssFileName` 釘住）+ README/CHANGELOG/docs import 範例；GitHub repo URL 不動（GitHub 自動轉址）。發佈後對舊套件 `npm deprecate`。

---

### Phase 6 — 後續優化（使用者提問衍生）✅ 完成（type-check + 27 測試 + build 自包含 + playground 截圖驗證）

> 以下 4 項為 v3 完成後的 review 問題，皆為「可做可不做」的優化，無功能 bug。每項都附決策與具體做法。
>
> **執行結果（本輪）：**
> - ✅ **6.1**：`theme.css` 新增 13 個自有 `--vdt-*` 設計 token；`components.css` 字面值改引用 token（dist 含 13 token 定義 / 54 處使用 / 0 consumer-only 變數殘留，值等價）。
> - ✅ **6.2**：刪除 `tailwind.utilities.css`，3 個 bridge class + 固定列陰影 + scrollbar 併入 `components.css`；`theme.css` 移除其 `@import`。styles/ 收斂為 **2 檔**（theme.css + components.css）。
> - ✅ **6.3（型別）**：`TailwindColor` 改由 `tailwind4-color.ts` 的 `keyof typeof tailwindBaseColors` 單一來源衍生（main→public 再匯出）；`theme?: TailwindColor | (string & {})` 保留色名補全；新增 `export`：`BodyRowDisabledFunction` / `PaginationInfo` / `DataTableSlots` / `ServerOptionsComputed`。**`SimpleFilterOption` 依使用者決定保留不收緊**（向後相容）。
> - ✅ **6.3（位置/命名）**：`types/main.ts → types/public.ts`、`utils/utils.ts → utils/itemValue.ts`（含測試檔）、`DataTable.vue → core/DataTable.vue`；全部 import specifier 已更新。
> - ✅ **6.4**：`tailwind4-color.ts` 保留（單一事實來源）；`resolvePrimaryColor` 於 dev 模式對「既非內建色名、`CSS.supports('color', …)` 亦為 false」的輸入 `console.warn`，避免靜默失效。

#### 6.1 CSS 改用設計 token（Q1）
- **問題**：`.vdt-*` class 目前用字面值（`font-size: 0.875rem`）。是否改用 token？
- **決策**：**不要直接用 Tailwind 的 `var(--text-sm)` / `calc(var(--spacing)*N)`** —— 出貨 CSS 已移除 Tailwind，這些 `@theme` 變數不存在於我們的 CSS，會解析失敗、樣式壞掉（違反「免裝 Tailwind / 自包含」）。
- **建議做法**：在 `theme.css` 定義**自有命名空間** `--vdt-*` 設計 token（自包含字面值），`components.css` 改引用：
  ```css
  /* theme.css :root */
  --vdt-text-xs: 0.75rem;   --vdt-text-sm: 0.875rem;
  --vdt-leading-sm: 1.25rem;
  --vdt-space-1: 0.25rem; --vdt-space-2: 0.5rem; --vdt-space-3: 0.75rem; --vdt-space-4: 1rem;
  --vdt-radius: 0.375rem;  --vdt-radius-sm: 0.125rem;
  --vdt-font-semibold: 600; --vdt-font-medium: 500;
  ```
  ```css
  /* components.css */
  .vdt-tbody { font-size: var(--vdt-text-sm); line-height: var(--vdt-leading-sm); }
  .vdt-thead-th { padding: var(--vdt-space-3) var(--vdt-space-4); font-weight: var(--vdt-font-semibold); }
  ```
- **效益**：單一調整點、尺寸一致、使用者可覆蓋（如 `--vdt-text-sm`）。**風險低**（純值替換，可由 computed-style 驗證等值）。中等工作量（掃過 components.css 全部字面值）。

#### 6.2 整併 styles/ 三個 CSS 檔（Q2）
- **問題**：`theme.css` / `tailwind.utilities.css` / `components.css` 是否整併？
- **對使用者**：無差異（最終打包成單一 `dist/vue-datatable-tailwind.css`）。
- **對維護**：`tailwind.utilities.css` 已**名不符實**（只剩 `.bg-vdt-surface`/`.bg-vdt-surface-secondary`/`.hover:bg-vdt-interactive-hover` 3 個 bridge class + 固定列 + scrollbar）。
- **建議做法**：併成 **2 檔**——
  - `theme.css`：tokens + 深淺模式（+ 6.1 的 `--vdt-*` 設計 token）。
  - `components.css`：所有 `.vdt-*` class + 那 3 個 bridge class + 固定列陰影 + scrollbar。
  - 刪除 `tailwind.utilities.css`，移除 `theme.css` 對它的 `@import`。
- **風險低**（純搬移）。建議搬完後重建並確認 dist CSS 內容無缺。

#### 6.3 檔案位置 / 命名 / 對外 type（Q3）
- **對外 type 匯出缺漏（建議補 `export`）**：
  - `BodyRowDisabledFunction`（`disabledRows` prop 的型別）—— 目前**未匯出**，使用者標註自己的 disabledRows 函式時拿不到。
  - `DataTableSlots`（`src/types/slot.ts`）—— **未匯出**；雖有 `defineSlots` 給模板提示，但匯出可讓使用者在外部標註。
  - 評估匯出 `PaginationInfo`、`ServerOptionsComputed`（後者是 `update:serverOptions` 事件的 payload 型別，使用者處理該事件時可能需要）。
- **型別品質**：
  - `theme?: TailwindColor | string` —— `TailwindColor | string` 在 TS 會塌成 `string`，**失去色名自動補全**。改 `theme?: TailwindColor | (string & {})` 可同時保留色名提示與接受任意字串。
  - `SimpleFilterOption`（`{ field; comparison: string; criteria: any }`）過鬆，會弱化整個 `FilterOption` union 的型別檢查 —— 評估移除或收緊（v3 已是 major，可考慮）。
  - `TailwindColor`（main.ts 手寫 union）與 `tailwindBaseColors`（`Record<TailwindColor,…>`）已透過 Record 耦合（缺 key 會編譯錯）；可評估改 `type TailwindColor = keyof typeof tailwindBaseColors` 單一來源。
- **位置 / 命名（低優先、純整理）**：
  - `src/DataTable.vue` 在 `src/` 根，其餘元件在 `src/components/` —— 可移到 `components/` 或新增 `core/` 一致化（牽動 import 路徑）。
  - `src/types/main.ts`（對外型別）命名為 *main* 較不直觀，可改 `types/index.ts` 或 `types/public.ts`。
  - `src/utils/utils.ts`（`getItemValue`/`generateColumnContent`）泛名，可改 `itemValue.ts`。
  - `src/keys.ts`、`src/i18n/index.ts` 位置合理。

#### 6.4 tailwind4-color.ts 去留與「新色」處理（Q4）
- **要保留**：它是「色名 shorthand（`'indigo'`）→ 基準色 oklch」對照，是 `resolvePrimaryColor` 唯一需要查表的路徑；沒有它，使用者只能傳 hex/oklch。檔案很小（22 筆）。
- **「Tailwind 新增顏色、我們沒有」時的行為**：`resolvePrimaryColor('未知色名')` → 不在表內 → **原樣回傳** → CSS `--color-vdt-primary: 未知色名` → 非合法 CSS 顏色 → 瀏覽器忽略 → 該變數無效（沿用上一個值 / initial）。即**靜默失效，不會 throw**。
- **風險低**：Tailwind 很少新增色；22 色穩定；傳 hex/oklch 的使用者完全不受影響。
- **建議**：
  - 文件註明「色名 shorthand 僅支援內建 22 色；其他請傳 hex / rgb / oklch」。
  - （可選）dev 模式對「既非已知色名、且 `CSS.supports('color', input)` 為 false」的輸入 `console.warn`，避免靜默失效難以察覺。
  - 維持 `TailwindColor` 與 `tailwindBaseColors` 同步（已耦合）。
  - 若未來想完全免維護該表：接受只支援 hex/oklch + CSS 原生色名，移除 Tailwind 色名 shorthand（破壞性，需評估既有使用者）。

---

## 3. 對外 Props 建議（v3 可一併處理，需寫 migration）

- `theme`：行為改為「不吸附最近色、直接採用」；色名仍支援。
- `checkboxColumnWidth` 預設 `null → 36`（移除到處 `?? 36`）。
- `mustSort` 預設 `true → false`（讓可排序欄位能回到無排序，符合慣例）。
- Footer 樣式 props 命名統一：`footerClassName` / `mobileFooterClasses` / `desktopFooterClasses`（單複數不一致）。
- `itemsSelected` 用 `null` 當「不可選」開關較隱晦 → 評估獨立 `selectable` boolean（保留 `itemsSelected` 做 v-model）。
- 新增 `itemKey`（Phase 2）。
- **新增 `searchType: 'contains' | 'regex'`**（預設 contains）— 決策 6。
- **新增 `locale` + `localeOverrides`**（Phase 1.5）— 決策 8。
- **移除 `batchSelectionThreshold`**（決策 7，破壞性）；migration 註明「大量資料選取的進度遮罩已移除」。

---

## 4. 風險與注意事項

- **CSS 自包含鐵則**：Phase 1 build 後務必確認出貨 CSS 無 consumer-only 變數。
- **選取解耦（Phase 2）**易踩坑：跨頁選取、批次選取、disabledRows 三者交互要逐一驗。
- **破壞性變更**集中 v3；每項對外變更都要在 migration 文件記一筆。
- 每 phase 完成跑 `pnpm type-check && pnpm build`。

---

## 5. 進度追蹤

| Phase | 狀態 | 備註 |
|-------|------|------|
| 0 清理與 Bug | ✅ 完成 | 含搜尋改 contains（決策6）；type-check + build 通過 |
| 1a 主題引擎 | ✅ 完成 | token 模型 + useTheme + 移除 themeManager/colorUtils + 移除 peer；build 通過、CSS 自包含 |
| 1b 語義 class + 深色校正 | ✅ 完成 | 深色校正 + 全元件 .vdt-* 結構化；無-Tailwind 截圖驗證自包含；CSS 17.3kB/JS 54kB。僅 SelectionLoadingOverlay 留待 Phase 2 刪除 |
| 1.5 i18n | ✅ 完成 | en/zh-TW/zh-CN；locale + localeOverrides + 既有 message props(最高優先)；三語系驗證 |
| 2 項目識別與選取解耦 | ✅ 完成 | itemKey + Set<key>；批次移除；無 JSON.stringify/無污染；playground 驗證 |
| 3 composable 接線 | ✅ 完成 | 9 composable options 物件化 + 多鍵排序修正 + InjectionKey；聚合器依決策略過 |
| 4 型別與 DX | ✅ 完成 | typed emits + defineSlots + 型別收斂；泛型延後 |
| 5 測試與發佈 | ✅ 完成 | 27 測試/a11y/CHANGELOG/3.0.0/README install；playground 入庫 ✅；dts 改 plugin-less（移除 vite-plugin-dts/api-extractor，vue-tsc -p tsconfig.build.json 產逐檔 .d.ts）✅；剩 README.zh-TW 同步 |
| 6 後續優化(review 衍生) | ✅ 完成 | 6.1 自有 --vdt-* token / 6.2 併 CSS 為 2 檔 / 6.3 type 匯出+單一來源+檔案改名(main→public, utils→itemValue, DataTable→core/) / 6.4 色名表保留+dev warn；SimpleFilterOption 依決定保留 |

> 狀態圖例：⬜未開始 / 🟡進行中 / ✅完成。所有階段於 v3.0.0 發佈時已完成。
