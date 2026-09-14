// src/composables/useFixedColumn.ts
/**
    管理固定列的狀態
    計算固定列的位置
    處理固定列的寬度

 */
import { type Ref, computed } from 'vue';
import type { HeaderForRender } from '../types/internal';

type FixedColumnsInfo = {
    value: string,
    fixed: boolean,
    position: 'left' | 'right',
    distance: number,
    width: number,
};

export interface UseFixedColumnOptions {
    headersForRender: Ref<HeaderForRender[]>;
}

export default function useFixedColumn(options: UseFixedColumnOptions) {
    const { headersForRender } = options;
    // 篩選出設置了 fixed: true 的列
    const fixedHeaders = computed((): HeaderForRender[] => headersForRender.value.filter((header) => header.fixed));

    // 分別篩選左側和右側固定列
    const leftFixedHeaders = computed((): HeaderForRender[] =>
        fixedHeaders.value.filter(header => !header.fixedPosition || header.fixedPosition === 'left'));

    const rightFixedHeaders = computed((): HeaderForRender[] =>
        fixedHeaders.value.filter(header => header.fixedPosition === 'right'));

    // 返回最後一個左側固定列和第一個右側固定列的值，用於添加陰影效果
    const lastLeftFixedColumn = computed((): string => {
        if (!leftFixedHeaders.value.length) return '';
        return leftFixedHeaders.value[leftFixedHeaders.value.length - 1].value;
    });

    const firstRightFixedColumn = computed((): string => {
        if (!rightFixedHeaders.value.length) return '';
        return rightFixedHeaders.value[0].value;
    });

    const fixedColumnsInfos = computed((): FixedColumnsInfo[] => {
        if (!fixedHeaders.value.length) return [];
        const result: FixedColumnsInfo[] = [];
        // 處理左側固定列
        if (leftFixedHeaders.value.length) {
            // 獲取所有固定列的寬度數組
            const leftWidthArr = leftFixedHeaders.value.map(header => header.width ?? 100);
            // 計算每個固定列的位置信息
            leftFixedHeaders.value.forEach((header, index) => {
                result.push({
                    value: header.value,   // 列標籤
                    fixed: true, // 是否固定
                    position: 'left', // 固定位置
                    width: header.width ?? 100, // 列寬度
                    // 計算距離左側的距離
                    distance: index === 0 ? 0 : leftWidthArr.reduce((sum, width, i) =>
                        i < index ? sum + width : sum, 0),
                });
            });
        }
        // 處理右側固定列
        if (rightFixedHeaders.value.length) {
            const rightWidthArr = rightFixedHeaders.value.map(header => header.width ?? 100);
            rightFixedHeaders.value.forEach((header, index) => {
                result.push({
                    value: header.value,
                    fixed: true,
                    position: 'right',
                    width: header.width ?? 100,
                    distance: index === rightFixedHeaders.value.length - 1 ? 0 :
                        rightWidthArr.reduce((sum, width, i) =>
                            i > index ? sum + width : sum, 0),
                });
            });
        }
        return result;
    });


    // 陰影旗標（左右分開計算）由 useHorizontalScroll 依容器捲動狀態提供

    return {
        fixedHeaders,

        leftFixedHeaders,
        rightFixedHeaders,
        lastLeftFixedColumn,
        firstRightFixedColumn,

        fixedColumnsInfos,
    };
}
