<template>
  <VueFinalModal
    class="flex items-center justify-center"
    overlay-transition="vfm-fade"
    content-transition="vfm-fade"
    content-class="modal-box opacity-100">
    <div class="text-xl">
      {{ title }}
    </div>
    <slot />
    <div class="modal-action">
      <button class="btn" @click="emit('close')">{{ $t("cloudie.toasts.close") }}</button>
    </div>
  </VueFinalModal>
</template>

<script setup lang="ts">
import { VueFinalModal } from "vue-final-modal"

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()
</script>
