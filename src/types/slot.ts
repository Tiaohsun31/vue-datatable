// slots.ts
import { type Header, type Item, type PaginationInfo } from './public';

export interface DataTableSlots {
    // 表格整體
    'customize-headers': void;  // 自定義整個表頭區域
    'loading': void;           // 自定義加載狀態
    'empty-message': void;     // 自定義空數據提示
    'scroll-hint': {           // 水平溢出提示列內容（showScrollHint 且溢出時渲染）
        hasHorizontalOverflow: boolean;
    };

    // 表頭相關
    'header': { header: Header; index: number; sortable: boolean };  // 通用表頭單元格
    [key: `header-${string}`]: { header: Header; index: number; sortable: boolean };  // 特定列的表頭

    // 表體相關
    'body': Item[];           // 自定義整個表體
    'body-prepend': {         // 表體前插入內容
        items: Item[];
        pagination: PaginationInfo;
        headers: Header[];
    };
    'body-append': {          // 表體後插入內容
        items: Item[];
        pagination: PaginationInfo;
        headers: Header[];
    };

    // 行內容相關
    'item': { column: string; item: Item };  // 通用單元格內容
    [key: `item-${string}`]: Item;  // 特定列的單元格內容

    // 選擇相關
    'selection-checkbox': {    // 選擇框
        item: Item;
        index: number;
        isSelected: boolean;   // 此列目前是否被選取
        isDisabled: boolean;
        toggleSelectItem: () => void;
    };

    // 展開相關
    'expand': Item;           // 展開行內容
    'expand-button': {        // 展開按鈕
        item: Item;
        expanded: boolean;
        toggle: () => void;
    };

    // 分頁相關
    'pagination': {           // 自定義分頁
        isFirstPage: boolean;
        isLastPage: boolean;
        currentPaginationNumber: number;
        maxPaginationNumber: number;
        nextPage: () => void;
        prevPage: () => void;
        updatePage: (page: number) => void;
    };
    'pagination-info': {      // 分頁信息
        firstIndex: number;
        lastIndex: number;
        total: number;
        separator: string;
    };
}
