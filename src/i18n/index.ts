import type { DataTableLocale, LocaleName } from '../types/public';

/** 內建語系包 */
export const locales: Record<LocaleName, DataTableLocale> = {
    en: {
        emptyMessage: 'No Available Data',
        rowsPerPageMessage: 'rows per page:',
        rowsOfPageSeparatorMessage: 'of',
        horizontalScrollHint: 'Scroll horizontally, or focus the table and use arrow keys, to see more columns',
    },
    'zh-TW': {
        emptyMessage: '無可用資料',
        rowsPerPageMessage: '每頁筆數：',
        rowsOfPageSeparatorMessage: '/',
        horizontalScrollHint: '可左右滑動，或聚焦表格後使用方向鍵查看更多欄位',
    },
    'zh-CN': {
        emptyMessage: '无可用数据',
        rowsPerPageMessage: '每页条数：',
        rowsOfPageSeparatorMessage: '/',
        horizontalScrollHint: '可左右滑动，或聚焦表格后使用方向键查看更多列',
    },
};

export const defaultLocale: LocaleName = 'en';
