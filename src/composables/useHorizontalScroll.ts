// src/composables/useHorizontalScroll.ts
/**
    量測表格容器的水平捲動狀態：
    - hasHorizontalOverflow：內容是否比容器寬（可水平捲動）
    - showLeftShadow：左側有被捲走的內容（左固定欄陰影）
    - showRightShadow：右側還有未顯示的內容（右固定欄陰影）

    觸發重量的時機：容器 scroll、容器與 <table> 的 ResizeObserver（表格內容變寬時容器尺寸不一定會變）、
    以及呼叫端傳入的 watch 來源（items / headers / 分頁）變動後的 nextTick。
    不使用 MutationObserver。SSR 不會執行 onMounted；沒有 ResizeObserver 的環境退回 window resize。
 */
import { type Ref, type WatchSource, nextTick, onMounted, onUnmounted, readonly, ref, watch } from 'vue';

/** 捲動尺寸容許誤差：縮放或次像素排版時 scrollWidth 與 clientWidth 可能差 1px */
const TOLERANCE = 1;

export interface HorizontalScrollMetrics {
    scrollLeft: number;
    scrollWidth: number;
    clientWidth: number;
}

export interface HorizontalScrollState {
    hasHorizontalOverflow: boolean;
    showLeftShadow: boolean;
    showRightShadow: boolean;
}

/** 由容器尺寸推算捲動狀態（純函式，便於測試） */
export function getHorizontalScrollState({ scrollLeft, scrollWidth, clientWidth }: HorizontalScrollMetrics): HorizontalScrollState {
    return {
        hasHorizontalOverflow: scrollWidth - clientWidth > TOLERANCE,
        showLeftShadow: scrollLeft > 0,
        showRightShadow: scrollLeft + clientWidth < scrollWidth - TOLERANCE,
    };
}

export interface UseHorizontalScrollOptions {
    containerRef: Ref<HTMLElement | null>;
    tableRef: Ref<HTMLElement | null>;
    /** 變動後需要在 nextTick 重量的來源（如 items、headers、分頁） */
    watchSources: WatchSource[];
    onOverflowChange?: (value: boolean) => void;
}

export default function useHorizontalScroll(options: UseHorizontalScrollOptions) {
    const { containerRef, tableRef, watchSources, onOverflowChange } = options;

    const hasHorizontalOverflow = ref(false);
    const showLeftShadow = ref(false);
    const showRightShadow = ref(false);

    const measure = () => {
        const element = containerRef.value;
        if (!element) return;
        const state = getHorizontalScrollState(element);
        showLeftShadow.value = state.showLeftShadow;
        showRightShadow.value = state.showRightShadow;
        if (hasHorizontalOverflow.value !== state.hasHorizontalOverflow) {
            hasHorizontalOverflow.value = state.hasHorizontalOverflow;
            onOverflowChange?.(state.hasHorizontalOverflow);
        }
    };

    let cleanup: (() => void) | null = null;

    onMounted(() => {
        const element = containerRef.value;
        if (!element) return;

        element.addEventListener('scroll', measure, { passive: true });

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(measure);
            resizeObserver.observe(element);
            if (tableRef.value) resizeObserver.observe(tableRef.value);
        } else if (typeof window !== 'undefined') {
            window.addEventListener('resize', measure);
        }

        measure();

        cleanup = () => {
            element.removeEventListener('scroll', measure);
            if (resizeObserver) resizeObserver.disconnect();
            else if (typeof window !== 'undefined') window.removeEventListener('resize', measure);
        };
    });

    watch(watchSources, () => {
        void nextTick(measure);
    });

    onUnmounted(() => {
        cleanup?.();
        cleanup = null;
    });

    return {
        hasHorizontalOverflow: readonly(hasHorizontalOverflow),
        showLeftShadow: readonly(showLeftShadow),
        showRightShadow: readonly(showRightShadow),
        measure,
    };
}
