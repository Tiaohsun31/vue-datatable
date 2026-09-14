<template>
    <div class="min-h-screen p-8 space-y-6" :class="dark ? 'bg-neutral-900' : 'bg-neutral-100'">
        <!-- 控制列 -->
        <div class="flex flex-wrap items-center gap-4 p-4 rounded-lg"
            :class="dark ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-800'">
            <h1 class="text-lg font-bold">DataTable Playground</h1>
            <label class="flex items-center gap-2 text-sm">
                主色：
                <input v-model="theme" class="border rounded px-2 py-1 w-32 text-black" />
            </label>
            <button class="px-3 py-1 rounded border text-sm" @click="dark = !dark">
                切換 {{ dark ? '淺色' : '深色' }}
            </button>
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="borderCell" /> borderCell
            </label>
            <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="multiSort" /> multiSort
            </label>
            <label class="flex items-center gap-2 text-sm">
                locale：
                <select v-model="locale" class="border rounded px-2 py-1 text-black">
                    <option value="en">en</option>
                    <option value="zh-TW">zh-TW</option>
                    <option value="zh-CN">zh-CN</option>
                </select>
            </label>
            <span class="text-sm">已選 {{ selected.length }} 筆</span>
        </div>

        <!-- 表格 -->
        <DataTable :headers="headers" :items="items" :theme="theme" :mode="dark ? 'dark' : 'light'"
            :rows-per-page="5" :border-cell="borderCell" :multi-sort="multiSort" :locale="locale" item-key="email"
            show-index
            v-model:items-selected="selected" :search-value="search" search-field="name">
            <template #expand="item">
                <div class="p-4 text-sm">
                    展開內容：{{ item.name }}（{{ item.email }}）
                </div>
            </template>
        </DataTable>

        <div class="flex items-center gap-2">
            <input v-model="search" placeholder="搜尋 name…"
                class="border rounded px-2 py-1 text-sm text-black" />
        </div>

        <!-- 水平溢出 / 可及性示範：固定高度 flex 版面 + 窄容器 + 左 checkbox 固定 + 右操作欄固定 -->
        <section class="space-y-3 p-4 rounded-lg" :class="dark ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-800'">
            <h2 class="font-bold">水平溢出偵測（3.1.0）</h2>
            <div class="flex flex-wrap items-center gap-4 text-sm">
                <label class="flex items-center gap-2">
                    容器寬度 {{ regionWidth }}px
                    <input v-model.number="regionWidth" type="range" min="480" max="1200" step="10" />
                </label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" v-model="showScrollHint" /> showScrollHint
                </label>
                <span data-testid="overflow-state">hasHorizontalOverflow：{{ hasOverflow }}</span>
            </div>

            <div id="scroll-demo" class="flex h-[420px] flex-col gap-2 border border-dashed p-2"
                :style="{ width: `${regionWidth}px` }">
                <div class="shrink-0 text-xs opacity-70">頁首（固定高度 flex 版面，DataTable 傳 class="min-h-0 flex-1"）</div>
                <DataTable ref="scrollDemoTable" class="min-h-0 flex-1" :headers="scrollHeaders" :items="items"
                    :theme="theme" :mode="dark ? 'dark' : 'light'" :locale="locale" item-key="email"
                    :rows-per-page="25" fixed-checkbox fixed-header v-model:items-selected="scrollSelected"
                    :show-scroll-hint="showScrollHint" scroll-region-label="使用者清單"
                    @update:has-horizontal-overflow="hasOverflow = $event">
                    <template #item-actions="item">
                        <div class="flex gap-1">
                            <button class="rounded border px-2 py-0.5 text-xs" @click.stop="lastAction = `編輯 ${item.name}`">編輯</button>
                            <input class="w-16 rounded border px-1 text-xs text-black" placeholder="備註" @click.stop />
                        </div>
                    </template>
                </DataTable>
            </div>
            <p class="text-sm">最後操作：{{ lastAction || '—' }}</p>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataTable, { type Header, type Item } from '../src/index'

const theme = ref('indigo')
const locale = ref<'en' | 'zh-TW' | 'zh-CN'>('en')
const dark = ref(false)
const borderCell = ref(false)
const multiSort = ref(false)
const search = ref('')
const selected = ref<Item[]>([])

const headers: Header[] = [
    { text: 'Name', value: 'name', sortable: true, fixed: true, width: 160 },
    { text: 'Gender', value: 'gender', sortable: true },
    { text: 'Age', value: 'age', sortable: true },
    { text: 'Email', value: 'email' },
    { text: 'City', value: 'city', sortable: true },
]

const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Mallory', 'Niaj']
const cities = ['Taipei', 'Tokyo', 'Seoul', 'Osaka', 'Kaohsiung']
// 水平溢出示範
const regionWidth = ref(720)
const showScrollHint = ref(true)
const hasOverflow = ref(false)
const scrollSelected = ref<Item[]>([])
const lastAction = ref('')
const scrollHeaders: Header[] = [
    { text: 'Name', value: 'name', sortable: true, width: 140 },
    { text: 'Gender', value: 'gender', sortable: true, width: 120 },
    { text: 'Age', value: 'age', sortable: true, width: 100 },
    { text: 'Email', value: 'email', width: 220 },
    { text: 'City', value: 'city', sortable: true, width: 140 },
    { text: 'Actions', value: 'actions', fixed: true, fixedPosition: 'right', width: 150 },
]

const items: Item[] = firstNames.map((name, i) => ({
    name,
    gender: i % 2 === 0 ? 'male' : 'female',
    age: 20 + ((i * 7) % 40),
    email: `${name.toLowerCase()}@example.com`,
    city: cities[i % cities.length],
}))
</script>
