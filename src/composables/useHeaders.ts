import {
    ref, type Ref, computed, type ComputedRef, type WritableComputedRef,
} from 'vue';
import type { Header, SortType } from '../types/public';
import type {
    ServerOptionsComputed, HeaderForRender, ClientSortOptions, DataTableEmitFn,
} from '../types/internal';

export interface UseHeadersOptions {
    showIndexSymbol: Ref<string>;
    checkboxColumnWidth: Ref<number | null>;
    expandColumnWidth: Ref<number>;
    fixedCheckbox: Ref<boolean>;
    fixedExpand: Ref<boolean>;
    fixedIndex: Ref<boolean>;
    headers: Ref<Header[]>;
    ifHasExpandSlot: ComputedRef<boolean>;
    indexColumnWidth: Ref<number>;
    isMultipleSelectable: ComputedRef<boolean>;
    isServerSideMode: ComputedRef<boolean>;
    mustSort: Ref<boolean>;
    serverOptionsComputed: WritableComputedRef<ServerOptionsComputed | null>;
    showIndex: Ref<boolean>;
    sortBy: Ref<string | string[]>;
    sortType: Ref<SortType | SortType[]>;
    multiSort: Ref<boolean>;
    expandColumn: Ref<string>;
    updateServerOptionsSort: (newSortBy: string, newSortType: SortType | null) => void;
    emits: DataTableEmitFn;
}

export default function useHeaders(options: UseHeadersOptions) {
    const {
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
    } = options;
    // 固定列相關計算
    const computeFixedColumns = computed(() => {
        if (!headers.value.length) return { hasFixedColumns: false, fixedHeaders: [], unFixedHeaders: [] };

        return {
            hasFixedColumns: headers.value.some(header => header.fixed),
            fixedHeaders: headers.value.filter(header => header.fixed),
            unFixedHeaders: headers.value.filter(header => !header.fixed)
        }
    });

    // 生成客戶端排序選項
    const clientSortOptions = ref<ClientSortOptions | null>(
        initializeClientSortOptions(sortBy.value, sortType.value, multiSort.value)
    );

    // 處理排序狀態
    const { determineHeaderSortState } = useSortState(isServerSideMode, serverOptionsComputed, multiSort, clientSortOptions);

    // 生成表頭渲染數據
    const headersForRender = computed((): HeaderForRender[] => {
        // 先將所有 header 添加 sortType
        const processedHeaders = headers.value.map(header => ({
            ...header,
            sortType: header.sortable ? determineHeaderSortState(header.value) : undefined
        }));

        // 再分類
        const leftFixedHeaders = processedHeaders.filter(
            h => h.fixed && (!h.fixedPosition || h.fixedPosition === 'left')
        );
        const normalHeaders = processedHeaders.filter(h => !h.fixed);
        const rightFixedHeaders = processedHeaders.filter(
            h => h.fixed && h.fixedPosition === 'right'
        );

        // 特殊列處理
        const specialColumns = Object.values(specialColumnsConfig.value).filter(Boolean);

        // 按正確順序返回所有列
        return [
            ...specialColumns,
            ...leftFixedHeaders,
            ...normalHeaders,
            ...rightFixedHeaders
        ] as HeaderForRender[];
    });

    // 添加特殊列 (索引列、複選框列、擴展列)
    const specialColumnsConfig = computed(() => ({
        checkbox: isMultipleSelectable.value && {
            text: 'checkbox',
            value: 'checkbox',
            fixed: fixedCheckbox.value || computeFixedColumns.value.hasFixedColumns,
            fixedPosition: 'left' as const,
            width: checkboxColumnWidth.value ?? 36
        },
        index: showIndex.value && {
            text: showIndexSymbol.value,
            value: 'index',
            fixed: fixedIndex.value || computeFixedColumns.value.hasFixedColumns,
            fixedPosition: 'left' as const,
            width: indexColumnWidth.value
        },
        expand: ifHasExpandSlot.value && !expandColumn.value && {
            text: '',
            value: 'expand',
            fixed: fixedExpand.value || computeFixedColumns.value.hasFixedColumns,
            fixedPosition: 'left' as const,
            width: expandColumnWidth.value
        }
    }));

    const headerColumns = computed((): string[] =>
        headersForRender.value.map(header => header.value)
    );

    // 更新排序狀態
    const updateSortField = (newSortBy: string, oldSortType: SortType | 'none') => {
        const newSortType = oldSortType === 'none' ? 'asc'
            : oldSortType === 'asc' ? 'desc'
                : mustSort.value ? 'asc' : null;

        if (isServerSideMode.value) {
            updateServerOptionsSort(newSortBy, newSortType);
            return;
        }

        const newClientSortOptions = multiSort.value
            ? handleMultiSort(newSortBy, newSortType, clientSortOptions.value)
            : handleSingleSort(newSortBy, newSortType);

        clientSortOptions.value = newClientSortOptions;

        emits('updateSort', { sortType: newSortType, sortBy: newSortBy });
    };

    // 多重排序輔助方法
    const isMultiSorting = computed(() => (headerText: string): boolean => {
        const sortByArray = isServerSideMode.value
            ? serverOptionsComputed.value?.sortBy
            : clientSortOptions.value?.sortBy;

        return Array.isArray(sortByArray) && sortByArray.includes(headerText);
    });

    const getMultiSortNumber = computed(() => (headerText: string): number | false => {
        const sortByArray = isServerSideMode.value
            ? serverOptionsComputed.value?.sortBy
            : clientSortOptions.value?.sortBy;

        return Array.isArray(sortByArray)
            ? sortByArray.indexOf(headerText) + 1
            : false;
    });

    return {
        clientSortOptions,
        headerColumns,
        headersForRender,
        updateSortField,
        isMultiSorting,
        getMultiSortNumber,
    };
}

// 初始化客戶端排序選項
function initializeClientSortOptions(
    sortBy: string | string[],
    sortType: SortType | SortType[],
    isMultiSort: boolean
): ClientSortOptions | null {
    if (isMultiSort && Array.isArray(sortBy) && Array.isArray(sortType)) {
        return {
            sortBy,
            sortDesc: sortType.map(type => type === 'desc'),
        };
    }

    if (typeof sortBy === 'string' && sortBy !== '') {
        return {
            sortBy,
            sortDesc: sortType === 'desc',
        };
    }

    return null;
}

// 處理多重排序
const handleMultiSort = (newSortBy: string, newSortType: SortType | null, currentOptions: ClientSortOptions | null): ClientSortOptions | null => {
    if (!currentOptions?.sortBy || !Array.isArray(currentOptions.sortBy) || !Array.isArray(currentOptions.sortDesc)) {
        return newSortType === null ? null : {
            sortBy: [newSortBy],
            sortDesc: [newSortType === 'desc'],
        };
    }

    const index = currentOptions.sortBy.indexOf(newSortBy);
    const newSortBy_ = [...currentOptions.sortBy];
    const newSortDesc = [...currentOptions.sortDesc];

    if (index === -1 && newSortType !== null) {
        newSortBy_.push(newSortBy);
        newSortDesc.push(newSortType === 'desc');
    } else if (newSortType === null) {
        newSortBy_.splice(index, 1);
        newSortDesc.splice(index, 1);
    } else {
        newSortDesc[index] = newSortType === 'desc';
    }

    return { sortBy: newSortBy_, sortDesc: newSortDesc };
};

// 處理單一排序
const handleSingleSort = (newSortBy: string, newSortType: SortType | null): ClientSortOptions | null => {
    return newSortType === null ? null : {
        sortBy: newSortBy,
        sortDesc: newSortType === 'desc',
    };
};

function useSortState(
    isServerSideMode: ComputedRef<boolean>,
    serverOptionsComputed: WritableComputedRef<ServerOptionsComputed | null>,
    multiSort: Ref<boolean>,
    clientSortOptions: Ref<ClientSortOptions | null>
) {
    const determineHeaderSortState = (headerValue: string): SortType | 'none' => {
        if (!isServerSideMode.value || !serverOptionsComputed.value) {
            return getClientSortState(headerValue);
        }
        return getServerSortState(headerValue);
    };

    const getClientSortState = (headerValue: string): SortType | 'none' => {
        if (!clientSortOptions.value) return 'none';

        const { sortBy: clientSortBy, sortDesc } = clientSortOptions.value;

        if (multiSort.value && Array.isArray(clientSortBy) && Array.isArray(sortDesc)) {
            const index = clientSortBy.indexOf(headerValue);
            return index !== -1 ? (sortDesc[index] ? 'desc' : 'asc') : 'none';
        }

        return headerValue === clientSortBy ? (sortDesc ? 'desc' : 'asc') : 'none';
    };

    const getServerSortState = (headerValue: string): SortType | 'none' => {
        const { sortBy: serverSortBy, sortType: serverSortType } = serverOptionsComputed.value!;

        if (multiSort.value && Array.isArray(serverSortBy) && Array.isArray(serverSortType)) {
            const index = serverSortBy.indexOf(headerValue);
            return index !== -1 ? serverSortType[index] : 'none';
        }

        return headerValue === serverSortBy && serverSortType ? serverSortType as SortType : 'none';
    };

    return {
        determineHeaderSortState,
    };
}
