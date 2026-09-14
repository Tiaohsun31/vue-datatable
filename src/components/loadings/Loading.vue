<template>
    <div class="vdt-loading">
        <div v-for="i in 4" :key="i" class="vdt-loading__ring" :class="[`vdt-loading__ring--${(i - 1) * 150}`]">
        </div>
    </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'VdtLoading' })
</script>

<style scoped>
.vdt-loading {
    display: inline-flex;
    position: relative;
    width: 60px;
    height: 60px;
}

.vdt-loading__ring {
    box-sizing: border-box;
    position: absolute;
    width: 80%;
    height: 80%;
    margin: 8px;
    border: 8px solid transparent;
    border-radius: 9999px;
    border-top-color: var(--color-vdt-primary);
    animation: ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.vdt-loading__ring--0 {
    animation-delay: -0.45s;
}

.vdt-loading__ring--150 {
    animation-delay: -0.3s;
}

.vdt-loading__ring--300 {
    animation-delay: -0.15s;
}

.vdt-loading__ring--450 {
    animation-delay: 0s;
}

@keyframes ring {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
