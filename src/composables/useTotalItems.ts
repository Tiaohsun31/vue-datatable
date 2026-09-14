import {
    type Ref, computed, type ComputedRef,
} from 'vue';
import type { Item, FilterOption, NumberFilterOption } from '../types/public';
import { isNumeric, isArrayFilterOption, isNumberFilterOption, isCustomFilterOption } from '../utils/filter';
import type { ClientSortOptions, DataTableEmitFn } from '../types/internal';
import { getItemValue } from '../utils/itemValue';
import { getItemKey, omitUiFields } from '../utils/itemKey';

export interface UseTotalItemsOptions {
    clientSortOptions: Ref<ClientSortOptions | null>;
    filterOptions: Ref<FilterOption[] | null>;
    isServerSideMode: ComputedRef<boolean>;
    items: Ref<Item[]>;
    itemsSelected: Ref<Item[] | null>;
    searchField: Ref<string | string[]>;
    searchValue: Ref<string>;
    searchType: Ref<'contains' | 'regex'>;
    serverItemsLength: Ref<number>;
    multiSort: Ref<boolean>;
    itemKey: Ref<string | undefined>;
    disabledRows: (item: Item) => boolean;
    emits: DataTableEmitFn;
}

export default function useTotalItems(options: UseTotalItemsOptions) {
    const {
        clientSortOptions, filterOptions, isServerSideMode, items, itemsSelected,
        searchField, searchValue, searchType, serverItemsLength, multiSort, itemKey,
        disabledRows, emits,
    } = options;
    // 搜索邏輯
    const searchTargetCache = new WeakMap<Item, string>();

    const getSearchTarget = (item: Item): string => {
        let target = searchTargetCache.get(item);
        if (!target) {
            if (typeof searchField.value === 'string' && searchField.value !== '') {
                target = String(getItemValue(searchField.value, item));
            } else if (Array.isArray(searchField.value)) {
                target = searchField.value
                    .map(field => String(getItemValue(field, item)))
                    .join(' ');
            } else {
                target = Object.values(item).map(String).join(' ');
            }
            searchTargetCache.set(item, target);
        }
        return target;
    };

    const itemsSearching = computed((): Item[] => {
        if (isServerSideMode.value || searchValue.value === '') return items.value

        if (searchType.value === 'regex') {
            let regex: RegExp
            try {
                regex = new RegExp(searchValue.value, 'i')
            } catch {
                // 無效的正則表達式時退回不過濾，避免整個搜尋崩潰
                return items.value
            }
            return items.value.filter((item) => regex.test(getSearchTarget(item)))
        }

        // 預設：不分大小寫的子字串包含比對
        const keyword = searchValue.value.toLowerCase()
        return items.value.filter((item) => getSearchTarget(item).toLowerCase().includes(keyword))
    })

    // 過濾邏輯
    const handleNumberComparison = (
        itemValue: string | number,
        option: NumberFilterOption
    ): boolean => {
        const numericValue = isNumeric(itemValue) ? itemValue : parseFloat(String(itemValue))

        if (isNaN(numericValue)) return false

        if (option.comparison === 'between' && Array.isArray(option.criteria)) {
            const [min, max] = option.criteria
            return numericValue >= min && numericValue <= max
        }

        const criteriaValue = option.criteria as number
        switch (option.comparison) {
            case '>': return numericValue > criteriaValue
            case '>=': return numericValue >= criteriaValue
            case '<': return numericValue < criteriaValue
            case '<=': return numericValue <= criteriaValue
            default: return false
        }
    }

    // 過濾項目
    const itemsFiltering = computed((): Item[] => {
        if (!filterOptions.value?.length) return itemsSearching.value

        return itemsSearching.value.filter((item) =>
            filterOptions.value!.every((option) => {
                const itemValue = getItemValue(option.field, item)

                if (isCustomFilterOption(option)) {
                    return option.comparison(itemValue, option.criteria)
                }

                if (isNumberFilterOption(option)) {
                    return handleNumberComparison(itemValue, option)
                }

                if (isArrayFilterOption(option)) {
                    return option.criteria.includes(itemValue)
                }

                // String comparison
                return option.comparison === '='
                    ? itemValue === option.criteria
                    : itemValue !== option.criteria
            })
        )
    })

    // 排序邏輯
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 排序欄位值可為任意型別（字串、數字、日期…）
    const compareValues = (a: any, b: any, isDesc: boolean): number => {
        if (a === b) return 0;
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;
        return a < b ? (isDesc ? 1 : -1) : (isDesc ? -1 : 1);
    };

    // 多鍵排序：依優先序逐欄位比較，第一個不相等者決定順序（單次 sort，O(n log n)）
    const multiSortComparator = (sortByArr: string[], sortDescArr: boolean[]) =>
        (a: Item, b: Item): number => {
            for (let i = 0; i < sortByArr.length; i += 1) {
                const result = compareValues(
                    getItemValue(sortByArr[i], a),
                    getItemValue(sortByArr[i], b),
                    sortDescArr[i],
                );
                if (result !== 0) return result;
            }
            return 0;
        };

    // flow: searching => filtering => sorting
    const totalItems = computed((): Item[] => {
        if (isServerSideMode.value) return items.value;
        if (!clientSortOptions.value) return itemsFiltering.value;

        const { sortBy, sortDesc } = clientSortOptions.value;
        const itemsToSort = [...itemsFiltering.value];

        if (multiSort.value && Array.isArray(sortBy) && Array.isArray(sortDesc)) {
            return sortBy.length
                ? itemsToSort.sort(multiSortComparator(sortBy, sortDesc))
                : itemsToSort;
        }

        return itemsToSort.sort((a, b) => {
            const valueA = getItemValue(sortBy as string, a);
            const valueB = getItemValue(sortBy as string, b);
            return compareValues(valueA, valueB, sortDesc as boolean);
        });
    });

    const totalItemsLength = computed((): number => (
        isServerSideMode.value ? serverItemsLength.value : totalItems.value.length
    ));

    const selectItemsComputed = computed({
        get: () => itemsSelected.value ?? [],
        set: (value) => {
            emits('update:itemsSelected', value);
        },
    });

    // 已選取項目的 key 集合，取代 JSON.stringify 比對
    const selectedKeys = computed((): Set<string> => {
        const set = new Set<string>();
        for (const item of selectItemsComputed.value) set.add(getItemKey(item, itemKey.value));
        return set;
    });

    const getSelectableItems = (list: Item[]): Item[] => list.filter(item => !disabledRows(item));

    const toggleSelectAll = (isChecked: boolean): void => {
        // 全部都被禁用時不動作
        if (totalItems.value.every(item => disabledRows(item))) return;
        selectItemsComputed.value = isChecked ? getSelectableItems(totalItems.value) : [];
        if (isChecked) emits('selectAll');
    };

    const toggleSelectItem = (item: Item): void => {
        if (disabledRows(item)) return;

        const key = getItemKey(item, itemKey.value);
        // 移除 UI 注入欄位後存入，避免污染使用者資料（不改動原物件）
        const cleanItem = omitUiFields(item);

        if (selectedKeys.value.has(key)) {
            selectItemsComputed.value = selectItemsComputed.value.filter(
                (selected) => getItemKey(selected, itemKey.value) !== key
            );
            emits('deselectRow', cleanItem);
        } else {
            selectItemsComputed.value = [cleanItem, ...selectItemsComputed.value];
            emits('selectRow', cleanItem);
        }
    };

    return {
        totalItems,
        selectItemsComputed,
        totalItemsLength,
        toggleSelectAll,
        toggleSelectItem,
    };
}

