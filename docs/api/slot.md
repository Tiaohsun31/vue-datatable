# DataTable Slots Documentation

The DataTable component provides various slots for customization. Here's a comprehensive list of available slots:

## Header Slots

### `customize-headers`

Replace the entire headers section with custom content.

```vue
<template #customize-headers>
  <thead>
    <!-- Custom header content -->
  </thead>
</template>
```

### `header`

Customize the content of each header cell.

```vue
<template #header="{ header, index, sortable }">
  <div class="custom-header">{{ header.text }}</div>
</template>
```

### `header-{column}`

Customize a specific column's header cell. Replace {column} with the column's value.

```vue
<template #header-name="{ header }">
  <div class="name-header">{{ header.text }}</div>
</template>
```

## Body Slots

### `body`

Replace the entire table body with custom content.

```vue
<template #body="items">
  <tbody>
    <!-- Custom body content -->
  </tbody>
</template>
```

### `body-prepend`

Add content before the table body.

```vue
<template #body-prepend="{ items, pagination, headers }">
  <!-- Content to prepend -->
</template>
```

### `body-append`

Add content after the table body.

```vue
<template #body-append="{ items, pagination, headers }">
  <!-- Content to append -->
</template>
```

## Cell Content Slots

### `item`

Customize the content of each cell.

```vue
<template #item="{ column, item }">
  <div class="custom-cell">{{ item[column] }}</div>
</template>
```

### `item-{column}`

Customize a specific column's cell content.

```vue
<template #item-name="item">
  <div class="name-cell">{{ item.name }}</div>
</template>
```

## Selection Slots

### `selection-checkbox`

Customize the selection checkbox. The slot exposes `isSelected` (whether this row is currently selected), `isDisabled`, and `toggleSelectItem`.

```vue
<template #selection-checkbox="{ item, index, isSelected, isDisabled, toggleSelectItem }">
  <CustomCheckbox :checked="isSelected" :disabled="isDisabled" @change="toggleSelectItem" />
</template>
```

## Expansion Slots

### `expand`

Customize the expanded row content.

```vue
<template #expand="item">
  <div class="expanded-content">
    <!-- Expanded row content -->
  </div>
</template>
```

### `expand-button`

Customize the expand button.

```vue
<template #expand-button="{ item, expanded, toggle }">
  <button @click="toggle">
    {{ expanded ? 'Collapse' : 'Expand' }}
  </button>
</template>
```

## Pagination Slots

### `pagination`

Customize the pagination section.

```vue
<template
  #pagination="{
    isFirstPage,
    isLastPage,
    currentPaginationNumber,
    maxPaginationNumber,
    nextPage,
    prevPage,
    updatePage,
  }"
>
  <CustomPagination v-bind="props" />
</template>
```

### `pagination-info`

Customize the pagination information display.

```vue
<template #pagination-info="{ firstIndex, lastIndex, total, separator }">
  <div>Showing {{ firstIndex }}-{{ lastIndex }} of {{ total }}</div>
</template>
```

## Other Slots

### `loading`

Customize the loading state display.

```vue
<template #loading>
  <CustomSpinner />
</template>
```

### `empty-message`

Customize the empty state message.

```vue
<template #empty-message>
  <div>No data available</div>
</template>
```

### `scroll-hint`

_Since 3.1.0._ Customize the hint bar shown above the table while it overflows horizontally.

The bar is rendered only when `show-scroll-hint` is enabled **and** the table actually overflows. Your content is placed inside the `.vdt-scroll-hint` element, which keeps its `id`, so the scroll container's `aria-describedby` still points at it.

Slot props: `{ hasHorizontalOverflow: boolean }`.

```vue
<DataTable show-scroll-hint scroll-region-label="Products" :headers="headers" :items="items">
  <template #scroll-hint="{ hasHorizontalOverflow }">
    <span v-if="hasHorizontalOverflow">← Swipe or use the arrow keys to see more columns →</span>
  </template>
</DataTable>
```

To only change the text, prefer `:locale-overrides="{ horizontalScrollHint: '…' }"` (see [i18n](./i18n.md)).
