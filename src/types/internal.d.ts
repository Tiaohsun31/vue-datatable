// 內部使用的類型定義，不導出
import type { SortType, Header, Item, ServerOptions, ClickRowArgument, UpdateSortArgument } from './public';

// 服務端選項計算結果：由 ServerOptions 衍生（page/rowsPerPage 必填，sort* 必填但可為 null）
export type ServerOptionsComputed = Omit<ServerOptions, 'sortBy' | 'sortType'> & {
    sortBy: string | string[] | null;
    sortType: SortType | SortType[] | null;
};

// 渲染用表頭：結構與 Header 一致
export type HeaderForRender = Header;

// 客戶端排序選項
export type ClientSortOptions = {
    sortBy: string | string[],
    sortDesc: boolean | boolean[],
}

// 點擊事件類型
export type ClickEventType = 'single' | 'double'

// 多選狀態
export type MultipleSelectStatus = 'allSelected' | 'noneSelected' | 'partSelected'

// 事件 payload 映射（供 defineEmits 與內部 emit 函式型別共用）
export type DataTableEmits = {
    clickRow: [item: ClickRowArgument, event: MouseEvent];
    contextmenuRow: [item: ClickRowArgument, event: MouseEvent];
    selectRow: [item: Item];
    deselectRow: [item: Item];
    expandRow: [index: number, item: Item];
    updateSort: [arg: UpdateSortArgument];
    'update:itemsSelected': [items: Item[]];
    'update:serverOptions': [options: ServerOptionsComputed | null];
    updatePageItems: [items: Item[]];
    updateTotalItems: [items: Item[]];
    selectAll: [];
    /** 容器水平溢出狀態改變時觸發（唯讀狀態，請用 @update:has-horizontal-overflow 監聽） */
    'update:hasHorizontalOverflow': [value: boolean];
};

// 事件名稱（由 payload 映射衍生，避免漂移）
export type EmitsEventName = keyof DataTableEmits;

// composable 接收的 emit 函式型別
export type DataTableEmitFn = <K extends keyof DataTableEmits>(event: K, ...args: DataTableEmits[K]) => void;
