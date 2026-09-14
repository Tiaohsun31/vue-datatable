# Changelog

## [3.1.0] - 2026-09-14

水平溢出偵測與可及性。**新 API 全部 opt-in**：未傳新 props 時，除了下列「右側固定欄陰影」修正之外，外觀與行為不變。唯一的相容性要求是 `vue` 需 ≥ 3.5（見 Peer Dependencies）。

### Peer Dependencies

- `vue` peerDependency 由 `^3.4.0` 提升為 **`^3.5.0`**：提示列 id 改用 Vue 3.5 的 `useId()`（SSR 與 hydration 一致）。Vue 3.5 已發布超過兩年；仍使用 3.4 的專案請先升級 Vue。同一頁面掛載多個 Vue app 時，請以 `app.config.idPrefix` 區分各 app 的 id。

### Features

- **水平溢出偵測**：以 `ResizeObserver` 同時觀察 `.vdt-table-container` 與 `<table>`（表格內容變寬時容器尺寸不一定會變），判斷 `scrollWidth - clientWidth > 1`；items / headers / 分頁變動後於 `nextTick` 重量。SSR 不執行量測，沒有 `ResizeObserver` 的環境退回 `window` resize。
  - 元件實例公開唯讀 **`hasHorizontalOverflow`**（`defineExpose`）。
  - 狀態改變時 emit **`update:hasHorizontalOverflow`**（以 `@update:has-horizontal-overflow` 監聽；沒有對應 prop，請勿用 `v-model`）。
- **`scrollRegionLabel` prop**：有傳入且溢出時，容器加上 `tabindex="0"`、`role="region"`、`aria-label`；未溢出時不加，避免多餘的 Tab 停留點。聚焦後使用**瀏覽器原生**方向鍵捲動（Chromium 實測足夠，元件不攔截按鍵，表格內輸入框與可排序表頭的鍵盤操作不受影響）。新增 `:focus-visible` 外框（`--color-vdt-primary`）。
- **`showScrollHint` prop**（預設 `false`）：溢出時在表格上方顯示 `.vdt-scroll-hint` 提示列，並以 `aria-describedby` 連到容器。
- **`scroll-hint` slot**（slot props：`{ hasHorizontalOverflow }`）完全自訂提示內容；`DataTableSlots` 型別同步更新。
- **i18n**：`DataTableLocale` 新增選填 `horizontalScrollHint`，三個內建語系皆已提供，可用 `localeOverrides` 覆寫；自訂語系未提供時退回 `en` 字串（選填以維持既有型別相容）。
- **版面**：`.vdt-table-wrapper` 改為直向 flex。放進固定高度 flex 版面（使用端傳 `class="min-h-0 flex-1"`）時，內部容器吃掉剩餘高度並自行捲動，不再把外層撐出第二條捲軸；未限制高度時排版與先前相同（1280px / 768px 量測一致）。README 補「放在固定高度 flex 版面中」範例。
- 新增 class hook：`.vdt-scroll-hint`、`.vdt-table-container--shadow-left`、`.vdt-table-container--shadow-right`。

### Bug Fixes

- **右側固定欄陰影時機錯誤**：原本左右共用 `scrollLeft > 0` 一個旗標，導致右側固定欄在「右邊還有內容」的初始位置沒有陰影、捲到最右邊（已無隱藏內容）時反而出現。改為左右分開計算：左側 `scrollLeft > 0`、右側 `scrollLeft + clientWidth < scrollWidth - 1`，且在 resize 時也重算（原本只在 scroll 時算）。
  - 相容：`.show-shadow` / `.vdt-table-container--shadow` 仍保留「已離開最左側」語義；若曾自行以 `.show-shadow .fixed-right-shadow` 覆寫右側陰影，請改用 `.vdt-table-container--shadow-right`。
- 修復 `eslint.config.js` 最後一段規則未包在 `rules` 內，導致 `pnpm lint` 直接拋出設定錯誤；並清掉因此長期未被檢出的 lint 錯誤（未使用的 import / 變數、`Loading` 元件命名）。公開型別中刻意保留的 `any`（`Item`、filter 選項）以註解標示，**型別不變**。

## [3.0.3] - 2026-08-13

### Bug Fixes

- 修復 `alternating={false}`（關閉交替列底色）時，**每一列都套用次要表面色**（`bg-vdt-surface-secondary`）而整個表身呈現灰底的問題。原因：條件式 class 的 `!alternating ||` 落在次要色那一支，關閉交替色等同「全部使用斑馬紋的深色那一色」。修正為關閉時全部使用基底色 `bg-vdt-surface`（仍保留明確底色，固定列的 `background-color: inherit` 才不會變透明而在橫向捲動時透出內容）。

## [3.0.2] - 2026-06-16

### Bug Fixes

- 修復 `theme` prop（如 `theme="red"`）只改變主色本身，但 hover / subtle / ring / strong / border 等**衍生狀態色仍維持預設色**的問題。原因：衍生色以 `color-mix(…, var(--color-vdt-primary), …)` 宣告在 `:root`，`var()` 會在 `:root` 以預設主色代換完成、子層只繼承結果，故 wrapper 上的 inline 主色無法驅動衍生色。修正：將 5 個衍生狀態色改宣告在元件 wrapper（`.vdt-table-wrapper`），依各實例有效的 `--color-vdt-primary` 重新代換。per-instance `theme` 與家族層 `--tia-theme-primary` 換色皆正確生效。
- 新增家族模式`[data-tia-mode="dark"]`、[data-tia-mode="light"]

## [3.0.0] - 2026-06-15

主版本重構，聚焦主題系統、樣式自包含、選取邏輯與型別 DX。

### Breaking Changes

- **套件改名**：`@tiaohsun/vue-datatable-tailwind` → **`@tiaohsun/vue-datatable`**（v3 起免裝 Tailwind，後綴名實不符）。舊套件停止維護並導向新名；請改 `npm install @tiaohsun/vue-datatable` 與 `import '@tiaohsun/vue-datatable/style.css'`。
- **免裝 Tailwind**：元件改為出貨自包含 CSS，已移除 `tailwindcss` peerDependency。使用者不再需要在自己的 Tailwind 設定加 `@source '.../@tiaohsun/vue-datatable-tailwind/dist/**'`，只要 `import '@tiaohsun/vue-datatable/style.css'` 即可。
- **主題色**：`theme` 改為「直接採用使用者顏色」，不再吸附到最近的 Tailwind 色票；色階改由單一主色 + `color-mix()` 衍生（不再有 50–950 全色階變數）。
- 移除批次選取相關：prop `batchSelectionThreshold`、事件 `updateSelectionStatus`、`SelectionLoadingOverlay`。
- 移除從未觸發的 `updateFilter` 事件宣告。
- 個別文字 props（`emptyMessage` / `rowsPerPageMessage` / `rowsOfPageSeparatorMessage`）不再有預設值，改由 `locale` 提供（en 預設值與舊版相同，英文使用者無感）。

### Features

- **i18n**：新增 `locale`（內建 `en` / `zh-TW` / `zh-CN`）與 `localeOverrides`（可覆寫個別字串或傳完整自訂語系）。
- **`itemKey` prop**：指定唯一識別欄位，用於選取 / 展開 / 比對；未指定則用 `item.key`，再退回內容比對。
- **`searchType`**：`'contains'`（預設）或 `'regex'`；預設改為不分大小寫子字串包含。
- `.vdt-*` 語義 class 全面承載預設樣式，可直接覆寫；輸出 CSS 自包含、無泛用 utility 污染。
- typed `defineEmits` / `defineSlots`，事件與插槽具型別。
- `selection-checkbox` slot 新增 `isSelected` slot prop（不需再讀內部的 `item.checkbox`）。
- 新增 `--tia-*` 家族共用設計基元層（`@tiaohsun/vue-*` 各元件可共讀）：`--vdt-*` 設計 token 與預設 `--color-vdt-primary` 改為引用 `--tia-*`（帶字面 fallback，單獨安裝仍可運作）。設一次 `--tia-theme-primary` 即可調整整個家族主色；未指定 `theme` prop 時才走此層，指定時仍以 per-instance inline 覆蓋。
- 無障礙：可排序表頭 `aria-sort` + 鍵盤操作、展開鈕 `aria-expanded`/`aria-label`、全選 `indeterminate`。
- 增加`taupe`、`mauve`、`mist`、`olive`，tailwind 顏色支援。

### Bug Fixes

- 修復搜尋輸入正則特殊字元（如 `(`、`[`）導致整個搜尋崩潰。
- 修復 server 端多欄排序就地改動 props 物件、以及取消排序時誤刪末項。
- 修復深色模式下表頭等硬寫灰階未隨 `mode` 切換的問題。
- 修正多鍵排序實作（重複排序 → 單次穩定比較）。
- 移除選取流程對使用者資料物件的污染（不再 `delete item.checkbox/index`）與 `JSON.stringify` 身分比對。
- 修復 `onUnmounted` 內監聽器未正確移除（記憶體洩漏）。

## [2.3.2] - 2026-03-10

### Bug Fixes

- 修復無資料時 header 列被 empty message 覆蓋而消失的問題。
- 加深 `color-vdt-light-content-secondary`

## [2.3.1] - 2025-07-11

### Features

- 新增 `mode` 屬性，可設置為 `dark` 或 `light`，預設為 `light`。
- `--vdt-theme-500` 更改為 `--color-vdt-500`。
- 新增dark mode的風格與light mode的風格。
- scrollbar的樣式調整。

### Features

## [2.2.0] - 2025-05-29

### Features

- 修改 TableFooter 組件，匯出更多的屬性與新增數種slot提升對footer的自定義能力。
- 新增 Props `mobileFooterClasses`、`desktopFooterClasses`。
- 新增 className `vdt-footer`、`vdt-footer-mobile`、`vdt-footer-desktop`。
- 監聽表格滾輪事件，為fixed欄位新增陰影。

## [2.1.6] - 2025-05-12

### Bug Fixes

- 為固定列新增 shadow，以解決取代下邊框消失問題。

## [2.1.5] - 2025-05-11

### Bug Fixes

- 修復疑似DataTable沒有正確匯出問題

## [2.1.4] - 2025-05-09

### Bug Fixes

- Header無法正確點擊並觸發排序。

## [2.1.3] - 2025-05-06

### Features

- 新設置borderRow控制是否顯示行邊框。

### Bug Fixes

- 修復設置fixed欄位，移動時缺乏陰影及邊框。

## [2.1.2] - 2025-04-28

### Features

- 主題配置重新設定，現在可支援OKLCH設置，同時用root設置
- `theme:'indigo'`
- `theme:'#6366f1'`
- `theme:oklch(64.5% 0.246 16.439)`
- 直接修改基礎變數(全域設定)
  ```css
  :root {
    --vdt-theme-500: oklch(0.65 0.25 130) !important; /* Modify to green */
    /* Other colors...(50-950) */
  }
  ```

## [2.0.0] - 2025-04-27

### Styles

- Tailwind3更新至Tailwind4，版本2後將全面採用Tailwind4。

## [1.1.0] - 2025-04-26

### Features

- Header 增加 fixedPosition 屬性，設置固定行置左或是置右(未設置則為left)

## [1.0.5] - 2025-04-21

### Bug Fixes

- 修復 bodyItemClassName 未正確執行。

## [1.0.4] - 2025-04-18

### Styles

- 更新theme.ts檔，import的時候不在使用已棄用的Tailwind顏色命名

## [1.0.3] - 2024-01-08

### Refactor

- refactor(icons): 重構展開按鈕圖示
  - 移除 `IconExpandColumn.vue`（左箭頭）
  - 新增 `IconExpand.vue`（右箭頭）
  - 原因：統一 DataTable 展開/收合按鈕視覺方向

### Features

- feat(table): 優化展開列功能與過渡效果
  - 新增 `expandTransition` prop，控制展開過渡效果
  - 新增 `shouldEnableTransition` 內部邏輯
    - 自動偵測是否存在擴展列
    - 預設：有擴展列時自動啟用過渡效果

### Styles

- style(table): 重構表格邊框樣式
  - tbody: 移除 `divide-y divide-gray-200`
  - tr: 新增 `border-t` 樣式
  - 效果：優化擴展列在無內容時的邊框顯示
- style(expand): 強化展開列過渡效果
  - 在 `TableExpandRow.vue` 中實作 `grid-template-rows` 過渡動畫
  - 提供更流暢的展開/收合視覺體驗

## [1.0.2] - 2024-01-07

### Styles

- style(table): 調整表頭視覺層級
  - 更新預設背景色：`bg-gray-100` → `bg-gray-200`
  - 提升互動狀態辨識度：
    - hover: `bg-gray-300`
    - sort active: `bg-gray-400`
  - 目的：增強表頭層級區別，提升使用者體驗
- style(table): 優化表格行列樣式
  - 調換單雙數行底色
  - 調整對比度，提升資料可讀性

## [1.0.1] - 2024-12-22

### BREAKING CHANGES

- `DataTable` 組件結構重構，需更新使用方式
  - 將 slots 重新命名與定義
  - 移除過時的 props 選項
  - 子組件引用路徑改變

### Features

- 表格單複數間隔改用計算方式，移除 tailwind 依賴

### Refactor

- 拆分 DataTable 子組件
  - table/TableHeader.vue：表頭渲染與固定邏輯
  - table/TableHeaderCell.vue：表頭各欄位渲染及邏輯
  - table/TableBodyRow.vue：表格行渲染及邏輯
  - table/TableBodyCell.vue：單元格渲染及邏輯
  - table/TableExpandRow.vue：表格內展開列渲染及邏輯
  - table/TableFooter：表格的結尾頁腳區塊
  - table/RowsPerPageSelector.vue：每頁顯示筆數
  - table/PaginationInfo.vue：頁碼、筆數相關數據資訊
  - 重構後降低組件耦合度

### Bug Fixes

- 修復 Header 固定定位穿透問題，預設基底顏色

### Documentation

- docs: 更新 Slot 使用文檔
- docs: 新增 npm 發布相關文檔

## [1.0.0]

### BREAKING CHANGES

- refactor: 重構專案架構與樣式系統
  - SCSS 改為 TailwindCSS
  - 重新命名 className props:
    - `tableClassName` 改為 `wrapperClassName`
    - `tableClassName` 現在用於 `<table>` 元素
  - 移除 `headerTextDirection`，請改用 `headerClassName`
  - 移除 `bodyTextDirection`，改用 `bodyClassName`

### Features

- feat(selection): 強化資料選擇功能
  - 新增 `useBatchSelection` hook，處理大數據選擇（預設 10,000 筆以上啟用）
  - 新增 `clickRowToSelect` 功能
  - 新增 `disabledRows` 控制行點擊事件
  - 新增 `selection-checkbox` slot，支援客製化選擇框
- feat(expand): 新增 `expandColumn` prop，支援自訂展開欄位
- feat(filter): 新增 `createFilter` 輔助方法，優化篩選邏輯

### Refactor

- perf(hooks): 優化 `usePageItems`
  - 使用緩存的 key 比較
  - 提升大數據處理效能
  - 解決選擇時卡頓問題

### Styles

- style(css): 新增預設 CSS 類別（無預設樣式）：
  - `.vdt-table-wrapper`
  - `.vdt-table-container`
  - `.vdt-table`
  - `.vdt-thead`, `.vdt-thead-tr`, `.vdt-thead-th`
  - `.vdt-tbody`, `.vdt-tbody-tr`, `.vdt-tbody-td`
  - `.vdt-expand-row`
  - `.vdt-footer`
  - `.vdt-pagination`
- style(mobile): 優化行動版面配置，預設僅保留上下頁切換
