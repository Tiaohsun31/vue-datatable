<!-- components/table/ExpandRow.vue -->
<template>
    <tr class="vdt-expand-row"
        :class="[expandRowClassName, { 'bg-vdt-surface-secondary': (index + 1) % 2 === 0, 'vdt-expand-row--bordered': isExpanded }]">
        <td :colspan="columnsCount" class="vdt-expand-row__cell">
            <LoadingLine v-if="loading" class="vdt-expand-row__loading" />
            <div class="vdt-expand-row__grid" :class="{ 'vdt-expand-row__grid--open': isExpanded }">
                <div class="vdt-expand-row__inner">
                    <slot :isExpanded="isExpanded" :item="item" :index="index">

                    </slot>
                </div>
            </div>
        </td>
    </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Item } from '../../types/public'
import LoadingLine from '../loadings/LoadingLine.vue'

const props = defineProps<{
    item: Item
    index: number
    columnsCount: number
    loading?: boolean
    isExpanded: boolean
    bodyExpandRowClassName?: string | ((item: Item, index: number) => string)
}>()

const expandRowClassName = computed(() => {
    if (typeof props.bodyExpandRowClassName === 'function') {
        return props.bodyExpandRowClassName(props.item, props.index)
    }
    return props.bodyExpandRowClassName
})
</script>
