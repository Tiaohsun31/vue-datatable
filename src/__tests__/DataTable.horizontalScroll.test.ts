import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import DataTable from '../core/DataTable.vue';
import { getHorizontalScrollState } from '../composables/useHorizontalScroll';

// jsdom 沒有版面資訊：mock ResizeObserver，並在容器實例上 stub 捲動尺寸
class MockResizeObserver {
    static instances: MockResizeObserver[] = [];
    targets: Element[] = [];
    constructor(public callback: ResizeObserverCallback) {
        MockResizeObserver.instances.push(this);
    }
    observe(target: Element) {
        this.targets.push(target);
    }
    unobserve() { }
    disconnect() {
        this.targets = [];
    }
}

type Metrics = { scrollWidth: number; clientWidth: number; scrollLeft: number };

const headers = [
    { text: 'Name', value: 'name' },
    { text: 'Email', value: 'email' },
    { text: 'Actions', value: 'actions', fixed: true, fixedPosition: 'right' as const, width: 120 },
];
const items = [
    { name: 'Alice', email: 'alice@example.com', actions: '' },
    { name: 'Bob', email: 'bob@example.com', actions: '' },
];

const mountTable = (props: Record<string, unknown> = {}, options: Record<string, unknown> = {}) =>
    mount(DataTable, { props: { headers, items, ...props }, ...options });

/** 在容器上 stub 尺寸；回傳可修改的 metrics 物件 */
const stubMetrics = (el: HTMLElement, initial: Metrics) => {
    const metrics = { ...initial };
    (Object.keys(metrics) as (keyof Metrics)[]).forEach((key) => {
        Object.defineProperty(el, key, { configurable: true, get: () => metrics[key] });
    });
    return metrics;
};

const triggerResize = async () => {
    MockResizeObserver.instances.forEach((observer) =>
        observer.callback([], observer as unknown as ResizeObserver));
    await nextTick();
};

const OVERFLOW: Metrics = { scrollWidth: 1200, clientWidth: 800, scrollLeft: 0 };
const NO_OVERFLOW: Metrics = { scrollWidth: 800, clientWidth: 800, scrollLeft: 0 };

/** 掛載後 stub 尺寸並觸發 ResizeObserver，模擬容器實際排版 */
const mountWithMetrics = async (metrics: Metrics, props: Record<string, unknown> = {}, options: Record<string, unknown> = {}) => {
    const wrapper = mountTable(props, options);
    const container = wrapper.get('.vdt-table-container');
    const live = stubMetrics(container.element as HTMLElement, metrics);
    await triggerResize();
    return { wrapper, container, live };
};

beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('getHorizontalScrollState', () => {
    it('no overflow: no shadows', () => {
        expect(getHorizontalScrollState({ scrollWidth: 800, clientWidth: 800, scrollLeft: 0 })).toEqual({
            hasHorizontalOverflow: false, showLeftShadow: false, showRightShadow: false,
        });
    });

    it('treats a 1px difference as no overflow (sub-pixel rounding)', () => {
        expect(getHorizontalScrollState({ scrollWidth: 801, clientWidth: 800, scrollLeft: 0 })).toEqual({
            hasHorizontalOverflow: false, showLeftShadow: false, showRightShadow: false,
        });
    });

    it('overflow at the start: only right shadow (content hidden on the right)', () => {
        expect(getHorizontalScrollState({ scrollWidth: 1200, clientWidth: 800, scrollLeft: 0 })).toEqual({
            hasHorizontalOverflow: true, showLeftShadow: false, showRightShadow: true,
        });
    });

    it('overflow in the middle: both shadows', () => {
        expect(getHorizontalScrollState({ scrollWidth: 1200, clientWidth: 800, scrollLeft: 200 })).toEqual({
            hasHorizontalOverflow: true, showLeftShadow: true, showRightShadow: true,
        });
    });

    it('overflow scrolled to the end: only left shadow', () => {
        expect(getHorizontalScrollState({ scrollWidth: 1200, clientWidth: 800, scrollLeft: 400 })).toEqual({
            hasHorizontalOverflow: true, showLeftShadow: true, showRightShadow: false,
        });
        // 次像素捲動位置（399.5）仍視為到底
        expect(getHorizontalScrollState({ scrollWidth: 1200, clientWidth: 800, scrollLeft: 399.5 }).showRightShadow).toBe(false);
    });
});

describe('DataTable horizontal overflow detection', () => {
    it('observes both the container and the <table>', () => {
        const wrapper = mountTable();
        const targets = MockResizeObserver.instances.flatMap((observer) => observer.targets);
        expect(targets).toContain(wrapper.get('.vdt-table-container').element);
        expect(targets).toContain(wrapper.get('table').element);
    });

    it('exposes hasHorizontalOverflow and emits update:hasHorizontalOverflow on change', async () => {
        const { wrapper, live } = await mountWithMetrics(OVERFLOW);
        expect((wrapper.vm as unknown as { hasHorizontalOverflow: boolean }).hasHorizontalOverflow).toBe(true);
        expect(wrapper.emitted('update:hasHorizontalOverflow')).toEqual([[true]]);

        live.scrollWidth = 800;
        await triggerResize();
        expect((wrapper.vm as unknown as { hasHorizontalOverflow: boolean }).hasHorizontalOverflow).toBe(false);
        expect(wrapper.emitted('update:hasHorizontalOverflow')).toEqual([[true], [false]]);
    });

    it('re-measures on nextTick after items change', async () => {
        const { wrapper, live } = await mountWithMetrics(NO_OVERFLOW);
        live.scrollWidth = 1500;
        await wrapper.setProps({ items: [...items, { name: 'A very long name', email: 'long@example.com', actions: '' }] });
        await nextTick();
        expect(wrapper.emitted('update:hasHorizontalOverflow')).toEqual([[true]]);
    });

    it('degrades safely without ResizeObserver (falls back to window resize)', async () => {
        vi.stubGlobal('ResizeObserver', undefined);
        const wrapper = mountTable({ scrollRegionLabel: 'Products' });
        const container = wrapper.get('.vdt-table-container');
        stubMetrics(container.element as HTMLElement, OVERFLOW);
        window.dispatchEvent(new Event('resize'));
        await nextTick();
        expect(container.attributes('tabindex')).toBe('0');
        wrapper.unmount();
    });
});

describe('DataTable scroll region accessibility', () => {
    it('adds no focus stop or region role when not overflowing', async () => {
        const { container } = await mountWithMetrics(NO_OVERFLOW, { scrollRegionLabel: 'Products' });
        expect(container.attributes('tabindex')).toBeUndefined();
        expect(container.attributes('role')).toBeUndefined();
        expect(container.attributes('aria-label')).toBeUndefined();
    });

    it('becomes a focusable labelled region when overflowing', async () => {
        const { container } = await mountWithMetrics(OVERFLOW, { scrollRegionLabel: 'Products' });
        expect(container.attributes('tabindex')).toBe('0');
        expect(container.attributes('role')).toBe('region');
        expect(container.attributes('aria-label')).toBe('Products');
    });

    it('stays unchanged when overflowing without scrollRegionLabel (opt-in)', async () => {
        const { container } = await mountWithMetrics(OVERFLOW);
        expect(container.attributes('tabindex')).toBeUndefined();
        expect(container.attributes('role')).toBeUndefined();
        expect(container.attributes('aria-label')).toBeUndefined();
    });

    it('removes the attributes again when the overflow goes away', async () => {
        const { container, live } = await mountWithMetrics(OVERFLOW, { scrollRegionLabel: 'Products' });
        live.clientWidth = 1200;
        await triggerResize();
        expect(container.attributes('tabindex')).toBeUndefined();
        expect(container.attributes('role')).toBeUndefined();
    });
});

describe('DataTable scroll hint', () => {
    it('is not rendered by default even when overflowing', async () => {
        const { wrapper, container } = await mountWithMetrics(OVERFLOW);
        expect(wrapper.find('.vdt-scroll-hint').exists()).toBe(false);
        expect(container.attributes('aria-describedby')).toBeUndefined();
    });

    it('is not rendered when showScrollHint is on but the table fits', async () => {
        const { wrapper } = await mountWithMetrics(NO_OVERFLOW, { showScrollHint: true });
        expect(wrapper.find('.vdt-scroll-hint').exists()).toBe(false);
    });

    it('renders above the table and is linked via aria-describedby', async () => {
        const { wrapper, container } = await mountWithMetrics(OVERFLOW, { showScrollHint: true, scrollRegionLabel: 'Products' });
        const hint = wrapper.get('.vdt-scroll-hint');
        expect(hint.text()).toBe('Scroll horizontally, or focus the table and use arrow keys, to see more columns');
        expect(hint.attributes('id')).toBeTruthy();
        expect(container.attributes('aria-describedby')).toBe(hint.attributes('id'));
        // 提示列在容器之前
        const children = Array.from(wrapper.element.children);
        expect(children.indexOf(hint.element)).toBeLessThan(children.indexOf(container.element));
    });

    it('generates distinct hint ids per instance', async () => {
        const first = await mountWithMetrics(OVERFLOW, { showScrollHint: true });
        const second = await mountWithMetrics(OVERFLOW, { showScrollHint: true });
        expect(first.wrapper.get('.vdt-scroll-hint').attributes('id'))
            .not.toBe(second.wrapper.get('.vdt-scroll-hint').attributes('id'));
    });

    it('uses the built-in locale string', async () => {
        const { wrapper } = await mountWithMetrics(OVERFLOW, { showScrollHint: true, locale: 'zh-TW' });
        expect(wrapper.get('.vdt-scroll-hint').text()).toBe('可左右滑動，或聚焦表格後使用方向鍵查看更多欄位');
    });

    it('can be overridden with localeOverrides', async () => {
        const { wrapper } = await mountWithMetrics(OVERFLOW, {
            showScrollHint: true,
            locale: 'zh-TW',
            localeOverrides: { horizontalScrollHint: '表格可左右捲動' },
        });
        expect(wrapper.get('.vdt-scroll-hint').text()).toBe('表格可左右捲動');
    });

    it('falls back to the built-in string when a full custom locale omits it', async () => {
        const { wrapper } = await mountWithMetrics(OVERFLOW, {
            showScrollHint: true,
            localeOverrides: { emptyMessage: 'データがありません', rowsPerPageMessage: '行数：', rowsOfPageSeparatorMessage: '/', horizontalScrollHint: undefined },
        });
        expect(wrapper.get('.vdt-scroll-hint').text()).toBe('Scroll horizontally, or focus the table and use arrow keys, to see more columns');
    });

    it('supports the scroll-hint slot with hasHorizontalOverflow slot prop', async () => {
        const { wrapper } = await mountWithMetrics(OVERFLOW, { showScrollHint: true }, {
            slots: {
                'scroll-hint': `<template #scroll-hint="{ hasHorizontalOverflow }"><b class="custom">custom {{ hasHorizontalOverflow }}</b></template>`,
            },
        });
        expect(wrapper.get('.vdt-scroll-hint .custom').text()).toBe('custom true');
    });
});

describe('DataTable fixed column shadows', () => {
    it('shows only the right shadow at the start, both mid-scroll, only left at the end', async () => {
        const { container, live } = await mountWithMetrics(OVERFLOW);
        expect(container.classes()).toContain('vdt-table-container--shadow-right');
        expect(container.classes()).not.toContain('vdt-table-container--shadow-left');

        live.scrollLeft = 200;
        await container.trigger('scroll');
        expect(container.classes()).toContain('vdt-table-container--shadow-left');
        expect(container.classes()).toContain('vdt-table-container--shadow-right');

        live.scrollLeft = 400;
        await container.trigger('scroll');
        expect(container.classes()).toContain('vdt-table-container--shadow-left');
        expect(container.classes()).not.toContain('vdt-table-container--shadow-right');
        // 相容：舊的 show-shadow / --shadow 維持「已向右捲動」語義
        expect(container.classes()).toContain('show-shadow');
        expect(container.classes()).toContain('vdt-table-container--shadow');
    });

    it('recomputes shadows on resize, not only on scroll', async () => {
        const { container, live } = await mountWithMetrics(NO_OVERFLOW);
        expect(container.classes()).not.toContain('vdt-table-container--shadow-right');
        live.clientWidth = 600;
        await triggerResize();
        expect(container.classes()).toContain('vdt-table-container--shadow-right');
    });

    it('keeps fixed-column shadow hooks on the right-fixed cells', async () => {
        const { wrapper } = await mountWithMetrics(OVERFLOW);
        const lastCells = wrapper.findAll('.vdt-tbody-tr').map((row) => row.findAll('.vdt-tbody-td').at(-1)!);
        lastCells.forEach((cell) => expect(cell.classes()).toContain('fixed-right-shadow'));
    });
});
