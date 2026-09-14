# @tiaohsun/vue-datatable

## Introduction

本專案來自 [vue3-easy-data-table](https://github.com/HC200ok/vue3-easy-data-table) 客製化版本，並基於原始設計進行了大幅修改與擴展。

新增功能與修改部分由 tiaohsun 開發，並保留所有權利。

專案僅為客製化版本，相關修改請詳閱下方文件，重構時並未充分測試原有功能，若出現BUG，請透過 Discussions 留言給我。

版本說明：

- **v3+**：套件改名為 **`@tiaohsun/vue-datatable`**（舊的 `@tiaohsun/vue-datatable-tailwind` 已停止維護）；自包含樣式表 —— **不再需要安裝 Tailwind CSS** 即可使用本元件。
- **v2**：基於 Tailwind 4（套件名 `@tiaohsun/vue-datatable-tailwind`）。
- **v1**：適用 Tailwind 3。

完整 v3 遷移說明請見 [CHANGELOG](CHANGELOG.md)。

### README

- en [English](README.md)
- zh_TW [繁體中文](README.zh-TW.md)

## Refactoring and customization

- 重構程式碼結構。
- 移除了原始 SCSS，改用 TailwindCSS。
- 修改 `usePageItems`，使用緩存的 key 比較，提高效能以解決大數據選擇時卡頓問題。
- 新增 `expandColumn`，提供自訂義展開欄位。
- 新增 `filterOption` 輔助方法 `createFilter`。
- 修改部分預設值。
- 預設 Mobile 僅剩上下頁切換。
- 新增 `clickRowToSelect`，點擊表格行可以進行選擇。
- 新增 selection-checkbox slot，可以客製化選擇框，透過客製化控制框，可以由外部控制disabled等屬性。
- 新增 `disabledRows` 禁用 `clickRowToSelect` 點擊事件。
- 重新命名，`tableClassName` > `wrapperClassName`，`tableClassName`現在位於`<table :class=[tableClassName]>`
- 新增 `containerClassName`、`footerClassName`
- 新增穩定的 `.vdt-*` class hook（`.vdt-table-wrapper`、`.vdt-table-container`、`.vdt-table`、`.vdt-thead`、`.vdt-thead-tr`、`.vdt-thead-th`、`.vdt-tbody`、`.vdt-tbody-tr`、`.vdt-tbody-td`、`.vdt-expand-row`、`.vdt-footer`、`.vdt-pagination`…）。**v3 起這些 class 已承載元件預設樣式，可直接覆寫。**
- 移除`headerTextDirection`，請改用`headerClassName`統一控制，預設為`text-left`
- 移除`bodyTextDirection`，新增`bodyClassName`、`footerClassName`。
- 新增`expandTransition`，用來啟用擴展列過渡效果。
- 新增`mode`，可設置dark或light，預設為`light`。

### v3 重點

- **自包含樣式表** —— 不再需要 Tailwind CSS；只要 `import '.../style.css'`。
- **`theme`** 改為直接採用你的顏色（不再吸附最近的 Tailwind 色階）；狀態色由單一 `--color-vdt-primary` 經 `color-mix()` 衍生（舊的 50–950 色階變數已移除）。
- 新增 **`itemKey`**，用於穩定的列識別（選取／展開／比對）。
- 新增 **i18n**：`locale`（`en` / `zh-TW` / `zh-CN`）與 `localeOverrides`。
- 新增 **`searchType`**（預設 `'contains'`，或 `'regex'`）；搜尋預設改為不分大小寫子字串包含。
- 新增 Tailwind 色名 `taupe`、`mauve`、`mist`、`olive`。
- **移除** 批次選取（`batchSelectionThreshold` prop、`updateSelectionStatus` 事件）。

## Usage suggestions

1. 需要 Vue 3.5 以上（v3.1.0 起）；若專案使用 Tailwind，建議 Tailwind CSS 4 以上版本
2. 如果使用較舊版本，請注意以下幾點：
   - 檢查間距和對齊是否正確
   - 某些新特性可能不可用
   - 可能需要手動調整某些樣式
3. 如果發現樣式問題，可以：
   - 更新到建議的版本
   - 使用自定義樣式覆蓋
   - 參考相容性指南進行調整

## Install

請確定您已安裝 Node.js。**自 v3 起不再需要安裝 Tailwind CSS** —— 套件已出貨自包含樣式表。

```bash
// npm install
npm install @tiaohsun/vue-datatable
// pnpm add
pnpm add @tiaohsun/vue-datatable
```

```Typescript
// 全域使用main.ts中註冊 or 組件中使用
import DataTable from '@tiaohsun/vue-datatable'
import '@tiaohsun/vue-datatable/style.css'

app.component('DataTable', DataTable)
```

> **v3 遷移：** 舊版本需在 Tailwind 設定加入 `@source '.../@tiaohsun/vue-datatable-tailwind/dist/**'`（Tailwind 3 則為對應的 `content` 設定）。**現在已不需要** —— 只要 `import 'style.css'` 即可。完整 v3 變更請見 [CHANGELOG](CHANGELOG.md)。

## Theme

### v3（目前版本）

只需提供單一主色 —— 狀態色（hover / subtle / ring）會由 `color-mix()` 自動衍生。

- 透過 `theme` prop：
  - `theme="indigo"`（內建 Tailwind 色名）
  - `theme="#6366f1"`
  - `theme="oklch(64.5% 0.246 16.439)"`
- 或全域覆寫 CSS 變數：
  ```css
  :root {
    --color-vdt-primary: oklch(0.65 0.25 130); /* 衍生狀態色會自動更新 */
  }
  ```
- 色名 shorthand 支援 22 個內建色名；其他請傳 hex / rgb / oklch。
- 深淺模式：使用 `mode` prop（`'light'` | `'dark'`）或設定 `[data-vdt-mode]`；未設定則跟隨系統 `prefers-color-scheme`。
- 尺寸 token（`--vdt-text-sm`、`--vdt-space-*`、`--vdt-radius`…）可覆寫以調整間距 / 字級。

> **從 v2 遷移：** 舊的 50–950 色階（`--color-vdt-500` … 搭配 `!important`）已改為單一 `--color-vdt-primary` + `color-mix()` 模型。

### version 1.x.x

- `theme:'indigo'`
- `theme:'#6366f1'`
- `:theme:{ color:'indigo', variant: 'DEFAULT' }`

## 自訂樣式

自 v3 起，`.vdt-*` class 已承載元件預設樣式，並作為穩定的覆寫 hook —— 可直接在你自己的 CSS 覆寫（不需 `!important`），或透過 `--color-vdt-*` / `--vdt-*` CSS 變數重新配色。

className 類 props（`bodyRowClassName`、`headerClassName`…）仍接受任意 class 字串。若你的專案有用 Tailwind，可傳入 Tailwind utility；`!` 修飾符可強制蓋過預設樣式：

1. 使用 Tailwind 的 `!` 修飾符來強制應用樣式

```typescript
const bodyRowClassNameFunction: BodyRowClassNameFunction = (
  item: Item,
  rowNumber: number,
): string => {
  if (item.gender === '男') return '!bg-blue-100'
  return '!bg-red-100'
}
```

2. 修改奇偶行的樣式

```typescript
const bodyRowClassNameFunction: BodyRowClassNameFunction = (
  item: Item,
  rowNumber: number,
): string => {
  const isEven = rowNumber % 2 === 0
  if (item.gender === '男') {
    return isEven ? 'even:!bg-blue-100 odd:bg-blue-100' : 'odd:!bg-blue-100 even:bg-blue-100'
  }
  return isEven ? 'even:!bg-red-100 odd:bg-red-100' : 'odd:!bg-red-100 even:bg-red-100'
}
```

## Props

除了原本的[Props](https://hc200ok.github.io/vue3-easy-data-table-doc/props/common-props.html)外，新增下面Props

| **Name**         | **Required** | **Type**                                                              | **Default** | **Description**                                                                     |
| ---------------- | ------------ | --------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| expand-column    | false        | string                                                                | ''          | 指定某 Column 欄位可以擴展。                                                        |
| theme            | false        | string \| TailwindColor (ex: 'indigo'、'rose')                        | 'indigo'    | 主色。可填入內建色名、HEX（`#42b883`）、rgb 或 oklch；狀態色由 `color-mix()` 衍生。 |
| mode             | false        | 'light' \| 'dark'                                                     | —           | 強制淺色或深色；未設定則跟隨系統 `prefers-color-scheme`。                           |
| itemKey          | false        | string                                                                | —           | 列的唯一識別欄位（選取／展開／比對用）；未指定則用 `item.key`，再退回內容比對。     |
| searchType       | false        | 'contains' \| 'regex'                                                 | 'contains'  | 不分大小寫子字串包含（預設）或正規表達式。                                          |
| locale           | false        | 'en' \| 'zh-TW' \| 'zh-CN'                                            | 'en'        | 內建語系（頁尾／空資料提示）。                                                      |
| localeOverrides  | false        | Partial\<DataTableLocale\>                                            | —           | 覆寫個別語系字串，或傳入完整自訂語系物件。                                          |
| clickRowToSelect | false        | boolean                                                               | false       | 點擊列，是否選擇項目。                                                              |
| disabledRows     | false        | BodyRowDisabledFunction = (item: Item, rowNumber?: number) => boolean | —           | 禁止特定行被選取。                                                                  |
| expandTransition | false        | boolean                                                               | true        | 如果有設置擴展列，預設啟用擴展列過渡效果。                                          |
| scrollRegionLabel | false       | string                                                                | —           | _3.1.0_ 捲動區域的無障礙名稱。有傳入**且**表格水平溢出時，容器加上 `tabindex="0"`、`role="region"`、`aria-label`。 |
| showScrollHint   | false        | boolean                                                               | false       | _3.1.0_ 表格水平溢出時在上方顯示提示列（文字來自 `locale.horizontalScrollHint` 或 `scroll-hint` slot）。 |

## 水平溢出與無障礙

_3.1.0 起提供，全部 opt-in。_ 表格以 `ResizeObserver` 同時觀察容器與 `<table>`，量測內容是否比容器寬（`scrollWidth - clientWidth > 1`），items / headers / 分頁變動後也會重量。沒有 `ResizeObserver`（或 SSR）時安全降級。

```vue
<DataTable
  ref="table"
  :headers="headers"
  :items="items"
  scroll-region-label="商品清單"
  show-scroll-hint
  locale="zh-TW"
  @update:has-horizontal-overflow="(value) => (overflowing = value)"
/>
```

- **`scrollRegionLabel`**：溢出時 `.vdt-table-container` 成為可聚焦、有名稱的 `role="region"`，鍵盤使用者可用 Tab 聚焦後以方向鍵左右捲動；沒有溢出時不加 `tabindex`，避免多一個沒用的 Tab 停留點。`:focus-visible` 外框使用 `--color-vdt-primary`。
- **`showScrollHint`**：溢出時在表格上方渲染 `.vdt-scroll-hint`，並以 `aria-describedby` 連到容器。文字可用 `localeOverrides.horizontalScrollHint` 覆寫，或以 [`scroll-hint`](./docs/api/slot.md#scroll-hint) slot 完全自訂。
- **`hasHorizontalOverflow`**：唯讀，透過元件實例取得（`table.value.hasHorizontalOverflow`）。變動時也會 emit `update:hasHorizontalOverflow`，請用 `@update:has-horizontal-overflow` 監聽（沒有對應 prop，不要用 `v-model`）。
- **固定欄陰影**：右側固定欄的陰影改為「右邊還有未顯示內容」時出現；左側固定欄維持「已離開最左側」時出現。捲動與尺寸變動時都會重算。新增 class hook：`.vdt-table-container--shadow-left` / `--shadow-right`。

使用端原本以 `querySelector('.vdt-table-container')` 自行量測溢出、讓外層 div 可聚焦並攔截方向鍵的寫法，可改為上述 props，不再依賴套件內部 DOM。

### 放在固定高度 flex 版面中

根元素 `.vdt-table-wrapper` 為直向 flex。讓表格吃掉 flex 欄位剩餘高度，內部容器就會自行（雙向）捲動、頁尾維持可見，外層不會多出第二條捲軸：

```vue
<template>
  <div class="flex h-screen flex-col">
    <header class="shrink-0">…</header>

    <!-- 必須加 min-h-0：flex 子項預設 min-height: auto，不加會被內容撐開 -->
    <DataTable class="min-h-0 flex-1" fixed-header :headers="headers" :items="items"
      scroll-region-label="商品清單" show-scroll-hint locale="zh-TW" />
  </div>
</template>
```

不使用 Tailwind 時：`.page { display: flex; flex-direction: column; height: 100vh }`、`.table { flex: 1 1 auto; min-height: 0 }`。容器仍保有 `min-height: 180px`；未限制高度時排版與先前完全相同。

## API 文件

- [Slot](./docs/api/slot.md)
- [Filter Options](./docs/api/filterOptions.md)
- [Theme（主題與顏色）](./docs/api/theme.md)
- [i18n（多語系）](./docs/api/i18n.md)
- [itemKey（列識別）](./docs/api/itemKey.md)
- [Roadmap / 後續增強](./docs/ROADMAP.md)

## Acknowledgements

本專案基於 HC 的 vue3-easy-data-table。

原專案：
https://github.com/HC200ok/vue3-easy-data-table

感謝原作者創建並維護了該元件的基礎架構。
