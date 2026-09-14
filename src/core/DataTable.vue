<template>
    <div ref="tableWrapper" class="vdt-table-wrapper" :class="[wrapperClassName]"
        :style="themeStyle" v-bind="themeAttrs">
        <!-- Horizontal Scroll Hint -->
        <div v-if="isScrollHintVisible" :id="scrollHintId" class="vdt-scroll-hint">
            <slot name="scroll-hint" v-bind="{ hasHorizontalOverflow }">
                {{ messages.horizontalScrollHint ?? locales[defaultLocale].horizontalScrollHint }}
            </slot>
        </div>

        <!-- Main Table Container -->
        <div ref="tableContainer" class="vdt-table-container" :class="[{
            'vdt-table-container--shadow show-shadow': showLeftShadow,
            'vdt-table-container--shadow-left': showLeftShadow,
            'vdt-table-container--shadow-right': showRightShadow,
        }, containerClassName]" v-bind="scrollRegionAttrs">
            <table ref="tableElement" :id="tableNodeId" class="vdt-table" :class="[tableClassName]">
                <colgroup>
                    <col v-for="(header, index) in headersForRender" :key="index" :style="getColStyle(header)" />
                </colgroup>
                <!-- Custom Headers Slot -->
                <slot v-if="slots['customize-headers']" name="customize-headers"></slot>

                <!-- Default Headers -->
                <TableHeader v-bind="{
                    headers: headersForRender,
                    hideHeader,
                    fixedHeader,
                    headerClassName,
                    borderCell,
                    lastLeftFixedColumn,
                    firstRightFixedColumn,
                    headerItemClassName,
                    areAllVisibleRowsDisabled,
                    multipleSelectStatus,
                    multiSort,
                }" :is-multi-sorting="isMultiSorting" :get-multi-sort-number="getMultiSortNumber"
                    :get-fixed-distance="getFixedDistance" @header-click="handleHeaderClick"
                    @toggle-select-all="toggleSelectAll">

                    <template v-for="(_, name) in $slots" #[name]="slotData">
                        <slot :name="name" v-bind="slotData"></slot>
                    </template>

                </TableHeader>

                <!-- Table Body -->
                <slot v-if="ifHasBodySlot" name="body" v-bind="pageItems"></slot>

                <tbody v-else-if="headerColumns.length" class="vdt-tbody" :class="[bodyClassName]">
                    <!-- Body Prepend Slot -->
                    <slot name="body-prepend" v-bind="{
                        items: pageItems,
                        pagination: { isFirstPage, isLastPage, currentPaginationNumber, maxPaginationNumber, nextPage, prevPage },
                        headers: headersForRender
                    }"></slot>
                    <!-- Table Rows -->
                    <template v-for="(item, index) in pageItems" :key="item.key || index">

                        <TableBodyRow :item="item" :index="index" :columns="headerColumns" :alternating="alternating"
                            :no-hover="noHover" :border-cell="borderCell" :border-row="borderRow"
                            :body-row-className="bodyRowClassName" :body-item-class-name="bodyItemClassName"
                            :is-expanded="expandingItemIndexList.includes(index + prevPageEndIndex)"
                            :is-disabled="isItemDisabled(item)" :expand-column="expandColumn"
                            :get-fixed-distance="getFixedDistance" :get-fixed-column-classes="getFixedColumnClasses"
                            @click="handleRowClick($event, item, index)"
                            @dblclick="handleRowDoubleClick($event, item, index)"
                            @contextmenu="handleRowContextMenu($event, item)"
                            @toggle-expand="handleExpandToggle(index, item, $event)"
                            @toggle-select="handleToggleSelect(item)">
                            <template v-for="(_, name) in $slots" #[name]="slotData">
                                <slot :name="name" v-bind="slotData"></slot>
                            </template>
                        </TableBodyRow>

                        <!-- Expandable Row -->
                        <TableExpandRow
                            v-if="shouldEnableTransition || expandingItemIndexList.includes(index + prevPageEndIndex)"
                            :item="item" :index="index" :columns-count="headersForRender.length"
                            :loading="item.expandLoading"
                            :is-expanded="expandingItemIndexList.includes(index + prevPageEndIndex)"
                            :body-expand-row-className="bodyExpandRowClassName">
                            <slot name="expand" v-bind="item" />
                        </TableExpandRow>

                    </template>
                    <!-- Body Append Slot -->
                    <slot name="body-append" v-bind="{
                        items: pageItems,
                        pagination: { isFirstPage, isLastPage, currentPaginationNumber, maxPaginationNumber, nextPage, prevPage, updatePage },
                        headers: headersForRender
                    }">
                    </slot>
                </tbody>
            </table>

            <!-- Loading Overlay -->
            <div v-if="loading" class="vdt-loading-overlay">
                <div class="vdt-loading-overlay__inner">
                    <slot name="loading">
                        <Loading />
                    </slot>
                </div>
            </div>

            <!-- Empty Message -->
            <div v-if="!pageItems.length && !loading" class="vdt-empty">
                <slot name="empty-message">
                    {{ messages.emptyMessage }}
                </slot>
            </div>
        </div>

        <!-- Table Footer -->
        <div v-if="!hideFooter" class="vdt-footer-section">
            <!-- 完全自定義  -->
            <slot v-if="$slots['footer-content']" name="footer-content" v-bind="footerSlotProps" />

            <!-- 預設的 TableFooter，但支援部分自定義 -->
            <TableFooter v-else v-bind="tableFooterProps" @update:rows-per-page="updateRowsPerPage"
                @next-page="nextPage" @prev-page="prevPage" @update-page="updatePage">
                <!-- 傳遞所有 footer 相關的插槽 -->
                <template v-for="(_, name) in footerSlotNames" #[name]="slotData">
                    <slot :name="name" v-bind="slotData" />
                </template>
            </TableFooter>
        </div>

    </div>
</template>

<script lang="ts">
// 模組層計數器：產生各實例唯一的提示列 id（不用 useId 以維持 vue ^3.4 peer 相容）
let scrollHintIdCounter = 0;
</script>

<script setup lang="ts">
import {
    useSlots, computed, toRef, toRefs, ref, watch, provide, type Slot
} from 'vue';

import Loading from '../components/loadings/Loading.vue';

import useClickRow from '../composables/useClickRow';
import useExpandableRow from '../composables/useExpandableRow';
import useFixedColumn from '../composables/useFixedColumn';
import useHeaders from '../composables/useHeaders';
import useHorizontalScroll from '../composables/useHorizontalScroll';
import usePageItems from '../composables/usePageItems';
import usePagination from '../composables/usePagination';
import useRows from '../composables/useRows';
import useServerOptions from '../composables/useServerOptions';
import useTotalItems from '../composables/useTotalItems';

import type { Header, Item, DataTableProps, DataTableLocale } from '../types/public';
import type { HeaderForRender, DataTableEmits } from '../types/internal';
import type { DataTableSlots } from '../types/slot';
import { locales, defaultLocale } from '../i18n';
import { dataTableKey } from '../keys';

import TableHeader from '../components/table/TableHeader.vue';
import TableBodyRow from '../components/table/TableBodyRow.vue';
import TableExpandRow from '../components/table/TableExpandRow.vue';
import TableFooter from '../components/table/TableFooter.vue';

import { useTheme } from '../composables/useTheme';

const props = withDefaults(defineProps<DataTableProps>(), {
    alternating: true,
    buttonsPagination: true,
    checkboxColumnWidth: null,
    currentPage: 1,
    expandColumnWidth: 36,
    filterOptions: null,
    fixedExpand: false,
    fixedHeader: false,
    fixedCheckbox: false,
    fixedIndex: false,

    hideFooter: false,
    hideRowsPerPage: false,
    hideHeader: false,
    indexColumnWidth: 60,
    itemsSelected: null,
    loading: false,
    rowsPerPage: 25,
    rowsItems: () => [25, 50, 100],
    locale: 'en',
    searchField: '',
    searchValue: '',
    serverOptions: null,
    serverItemsLength: 0,
    showIndex: false,
    sortBy: '',
    sortType: 'asc',
    multiSort: false,

    wrapperClassName: '',
    containerClassName: '',
    tableClassName: '',
    headerClassName: '',
    headerItemClassName: '',
    bodyClassName: '',
    bodyRowClassName: '',
    bodyExpandRowClassName: '',
    bodyItemClassName: '',
    footerClassName: '',
    mobileFooterClasses: '',
    desktopFooterClasses: '',

    disabledRows: () => false,
    noHover: false,
    borderCell: false,
    borderRow: true,
    mustSort: true,
    clickEventType: 'single',
    clickRowToExpand: false,
    clickRowToSelect: false,
    tableNodeId: '',
    showIndexSymbol: '#',
    preventContextMenuRow: false,
    expandColumn: '',
    expandTransition: undefined,
    showScrollHint: false,

    theme: () => 'indigo',
    searchType: 'contains',
    items: () => [],
    headers: () => [],
});

const {
    checkboxColumnWidth,
    expandColumnWidth,
    indexColumnWidth,
    rowsItems,
    showIndexSymbol,

    currentPage,
    filterOptions,
    headers,
    itemsSelected,
    loading,
    items,
    rowsPerPage,
    searchField,
    searchValue,
    searchType,
    serverItemsLength,
    showIndex,
    sortBy,
    sortType,
    serverOptions,
    multiSort,
    mustSort,
    clickEventType,
    clickRowToExpand,
    clickRowToSelect,
    fixedExpand,
    fixedCheckbox,
    fixedIndex,
    itemKey,
    expandColumn,
} = toRefs(props);

//  主題：解析主色為 CSS 變數，並輸出深淺模式屬性
const { themeStyle, themeAttrs } = useTheme(toRef(props, 'theme'), toRef(props, 'mode'));

// slot
const slots = useSlots();
const ifHasExpandSlot = computed(() => !!slots.expand);
const ifHasBodySlot = computed(() => !!slots.body);
const footerSlotNames = computed(() => {
    const footerSlots: Record<string, Slot | undefined> = {};
    ['rows-per-page', 'pagination-info', 'pagination'].forEach(name => {
        if (slots[name]) {
            footerSlots[name] = slots[name];
        }
    });
    Object.keys(slots).forEach(name => {
        if (name.startsWith('footer-') && name !== 'footer-content') {
            footerSlots[name] = slots[name];
        }
    });
    return footerSlots;
});

const shouldEnableTransition = computed(() =>
    typeof props.expandTransition !== 'undefined'
        ? props.expandTransition
        : ifHasExpandSlot.value
)

// global dataTable $ref
const tableWrapper = ref<HTMLDivElement | null>(null);
const tableContainer = ref<HTMLDivElement | null>(null);
const tableElement = ref<HTMLTableElement | null>(null);
provide(dataTableKey, tableWrapper);

const emits = defineEmits<DataTableEmits>();
defineSlots<DataTableSlots>();

const isMultipleSelectable = computed((): boolean => itemsSelected.value !== null);
const isServerSideMode = computed((): boolean => serverOptions.value !== null);

// i18n：合併內建語系 + localeOverrides + 既有個別 message props（後者優先序最高，向後相容）
const messages = computed<DataTableLocale>(() => {
    const base = locales[props.locale] ?? locales[defaultLocale];
    const result: DataTableLocale = { ...base, ...(props.localeOverrides ?? {}) };
    if (props.rowsPerPageMessage !== undefined) result.rowsPerPageMessage = props.rowsPerPageMessage;
    if (props.rowsOfPageSeparatorMessage !== undefined) result.rowsOfPageSeparatorMessage = props.rowsOfPageSeparatorMessage;
    if (props.emptyMessage !== undefined) result.emptyMessage = props.emptyMessage;
    return result;
});

// 傳遞給完全自定義 footer 的所有屬性
const footerSlotProps = computed(() => ({
    // 分頁相關
    currentPaginationNumber: currentPaginationNumber.value,
    maxPaginationNumber: maxPaginationNumber.value,
    isFirstPage: isFirstPage.value,
    isLastPage: isLastPage.value,

    // 資料相關
    currentPageFirstIndex: currentPageFirstIndex.value,
    currentPageLastIndex: currentPageLastIndex.value,
    totalItemsLength: totalItemsLength.value,

    // 每頁行數相關
    rowsPerPage: rowsPerPageRef.value,
    rowsItems: rowsItemsComputed.value,
    rowsPerPageMessage: messages.value.rowsPerPageMessage,
    rowsOfPageSeparatorMessage: messages.value.rowsOfPageSeparatorMessage,

    // 配置相關
    hideRowsPerPage: props.hideRowsPerPage,
    hidePaginationInfo: props.hidePaginationInfo,
    buttonsPagination: props.buttonsPagination,

    // 方法
    nextPage,
    prevPage,
    updatePage,
    updateRowsPerPage,

    // 原始資料（如果需要的話）
    items: pageItems.value,
    headers: headersForRender.value,

    // 選擇相關
    selectedItems: selectItemsComputed.value,
    multipleSelectStatus: multipleSelectStatus.value,

    // 主題
    theme: props.theme
}))

// 傳遞給 TableFooter 的屬性
const tableFooterProps = computed(() => ({
    hideFooter: false, // 已在外層處理
    hideRowsPerPage: props.hideRowsPerPage,
    hidePaginationInfo: props.hidePaginationInfo,
    buttonsPagination: props.buttonsPagination,
    showShadow: showLeftShadow.value,
    footerClassName: props.footerClassName,
    mobileFooterClasses: props.mobileFooterClasses,
    desktopFooterClasses: props.desktopFooterClasses,

    rowsPerPage: rowsPerPageRef.value,
    rowsItems: rowsItemsComputed.value,
    rowsPerPageMessage: messages.value.rowsPerPageMessage,
    rowsOfPageSeparatorMessage: messages.value.rowsOfPageSeparatorMessage,

    currentPageFirstIndex: currentPageFirstIndex.value,
    currentPageLastIndex: currentPageLastIndex.value,
    totalItemsLength: totalItemsLength.value,

    currentPaginationNumber: currentPaginationNumber.value,
    maxPaginationNumber: maxPaginationNumber.value,
    isFirstPage: isFirstPage.value,
    isLastPage: isLastPage.value
}))

const {
    serverOptionsComputed,
    updateServerOptionsPage,
    updateServerOptionsSort,
    updateServerOptionsRowsPerPage,
} = useServerOptions({
    serverOptions,
    multiSort,
    emits,
});

const {
    clientSortOptions,
    headerColumns,
    headersForRender,
    updateSortField,
    isMultiSorting,
    getMultiSortNumber,
} = useHeaders({
    showIndexSymbol,
    checkboxColumnWidth,
    expandColumnWidth,
    fixedCheckbox,
    fixedExpand,
    fixedIndex,
    headers,
    ifHasExpandSlot,
    indexColumnWidth,
    isMultipleSelectable,
    isServerSideMode,
    mustSort,
    serverOptionsComputed,
    showIndex,
    sortBy,
    sortType,
    multiSort,
    expandColumn,
    updateServerOptionsSort,
    emits,
});

const {
    rowsItemsComputed,
    rowsPerPageRef,
    updateRowsPerPage,
} = useRows({
    isServerSideMode,
    rowsItems,
    serverOptions,
    rowsPerPage,
});

const {
    totalItems,
    selectItemsComputed,
    totalItemsLength,
    toggleSelectAll,
    toggleSelectItem,
} = useTotalItems({
    clientSortOptions,
    filterOptions,
    isServerSideMode,
    items,
    itemsSelected,
    searchField,
    searchValue,
    searchType,
    serverItemsLength,
    multiSort,
    itemKey,
    disabledRows: props.disabledRows,
    emits,
});

const {
    currentPaginationNumber,
    maxPaginationNumber,
    isLastPage,
    isFirstPage,
    nextPage,
    prevPage,
    updatePage,
    updateCurrentPaginationNumber,
} = usePagination({
    currentPage,
    isServerSideMode,
    loading,
    totalItemsLength,
    rowsPerPage: rowsPerPageRef,
    serverOptions,
    updateServerOptionsPage,
});

const {
    currentPageFirstIndex,
    currentPageLastIndex,
    multipleSelectStatus,
    pageItems,
} = usePageItems({
    currentPaginationNumber,
    isMultipleSelectable,
    isServerSideMode,
    items,
    rowsPerPageRef,
    selectItemsComputed,
    showIndex,
    totalItems,
    totalItemsLength,
    disabledRows: props.disabledRows,
    itemKey,
});

const prevPageEndIndex = computed(() => {
    if (currentPaginationNumber.value === 0) return 0;
    return (currentPaginationNumber.value - 1) * rowsPerPageRef.value;
});

const {
    expandingItemIndexList,
    updateExpandingItemIndexList: handleExpandToggle,
    clearExpandingItemIndexList,
} = useExpandableRow({
    items: pageItems,
    prevPageEndIndex,
    itemKey,
    emits,
});

const {
    fixedHeaders,
    lastLeftFixedColumn,
    firstRightFixedColumn,
    fixedColumnsInfos,
} = useFixedColumn({
    headersForRender,
});

// 水平溢出偵測 + 左右固定欄陰影旗標
const {
    hasHorizontalOverflow,
    showLeftShadow,
    showRightShadow,
} = useHorizontalScroll({
    containerRef: tableContainer,
    tableRef: tableElement,
    watchSources: [pageItems, headersForRender],
    onOverflowChange: (value) => emits('update:hasHorizontalOverflow', value),
});

// 提示列 id 在 setup 產生、只在掛載後溢出時才渲染，SSR 不會有 hydration 不一致
const scrollHintId = `vdt-scroll-hint-${++scrollHintIdCounter}`;
const isScrollHintVisible = computed(() => props.showScrollHint && hasHorizontalOverflow.value);

// 只在真的可捲動時才成為可聚焦的 region，避免多一個沒用的 Tab 停留點
const scrollRegionAttrs = computed(() => ({
    ...(props.scrollRegionLabel && hasHorizontalOverflow.value
        ? { tabindex: 0, role: 'region', 'aria-label': props.scrollRegionLabel }
        : {}),
    ...(isScrollHintVisible.value ? { 'aria-describedby': scrollHintId } : {}),
}));

// template style generation function
const getColStyle = (header: HeaderForRender): string | undefined => {
    const width = header.width ?? (fixedHeaders.value.length ? 100 : null);
    if (width) return `width: ${width}px; min-width: ${width}px;`;
    return undefined;
};

// 當有固定列時，給定一個距離，然後根據這個距離來設置樣式
const getFixedDistance = (column: string, type: 'td' | 'th' = 'th') => {
    if (!fixedHeaders.value.length) return undefined;
    const columnInfo = fixedColumnsInfos.value.find((info) => info.value === column);
    if (columnInfo) {
        const isLeft = columnInfo.position === 'left';
        return `
            position: sticky;
            ${isLeft ? `left: ${columnInfo.distance}px;` : `right: ${columnInfo.distance}px;`}
            z-index: ${type === 'th' ? 3 : 1};
        `;
    }
    return undefined;
};

// 處理固定列樣式
const getFixedColumnClasses = computed(() => {
    return (column: string) => {
        if (!fixedHeaders.value.length) return [];

        const classes: string[] = [];

        // 添加基本類
        const columnInfo = fixedColumnsInfos.value.find((info) => info.value === column);
        if (columnInfo) {
            classes.push('fixed-column');

            // 添加陰影類
            if (column === lastLeftFixedColumn.value) {
                classes.push('fixed-left-shadow');
            } else if (column === firstRightFixedColumn.value) {
                classes.push('fixed-right-shadow');
            }
        }

        return classes;
    };
});

const handleHeaderClick = (header: Header) => {
    if (header.sortable && header.sortType) {
        updateSortField(header.value, header.sortType);
    }
};

const isItemDisabled = (item: Item): boolean => {
    return typeof props.disabledRows === 'function' ? props.disabledRows(item) : false;
};

const areAllVisibleRowsDisabled = computed(() => {
    return pageItems.value.every((item) => props.disabledRows(item));
});

const handleToggleSelect = (item: Item) => {
    if (isItemDisabled(item)) return;
    toggleSelectItem(item);
};

const {
    handleRowClick,
    handleRowDoubleClick,
    handleRowContextMenu,
} = useClickRow({
    clickEventType,
    isMultipleSelectable,
    showIndex,
    isItemDisabled,
    clickRowToExpand,
    clickRowToSelect,
    handleExpandToggle,
    toggleSelectItem,
    emits
});

watch(loading, (newVal, oldVal) => {
    if (serverOptionsComputed.value) {
        // in server-side mode, turn to next page when api request finished.
        if (newVal === false && oldVal === true) {
            updateCurrentPaginationNumber(serverOptionsComputed.value.page);
            clearExpandingItemIndexList();
        }
    }
});

watch(rowsPerPageRef, (value) => {
    if (!isServerSideMode.value) {
        updatePage(1);
    } else {
        updateServerOptionsRowsPerPage(value);
    }
});

watch([searchValue, filterOptions], () => {
    if (!isServerSideMode.value) {
        updatePage(1);
    }
});

watch([currentPaginationNumber, clientSortOptions, searchField, searchValue, filterOptions], () => {
    clearExpandingItemIndexList();
}, { deep: true });

watch(pageItems, (value) => {
    emits('updatePageItems', value);
}, { deep: true });

watch(totalItems, (value) => {
    emits('updateTotalItems', value);
}, { deep: true });

defineExpose({
    currentPageFirstIndex,
    currentPageLastIndex,
    clientItemsLength: totalItemsLength,
    maxPaginationNumber,
    currentPaginationNumber,
    isLastPage,
    isFirstPage,
    nextPage,
    prevPage,
    updatePage,
    rowsPerPageOptions: rowsItemsComputed,
    rowsPerPageActiveOption: rowsPerPageRef,
    updateRowsPerPageActiveOption: updateRowsPerPage,
    hasHorizontalOverflow,
});

</script>
