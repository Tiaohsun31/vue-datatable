
import type { Item } from '../types/public';
export function getItemValue(field: string, item: Item): string | number {
    if (field.includes('.')) {
        const keys = field.split('.')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 逐層走訪任意巢狀結構
        let value: any = item

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key]
            } else {
                return ''
            }
        }

        return value ?? ''
    }
    return item[field] ?? ''
}

export function generateColumnContent(column: string, item: Item) {
    const content = getItemValue(column, item);
    return Array.isArray(content) ? content.join(',') : content;
}
