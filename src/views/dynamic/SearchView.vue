<template>
  <div>
    <div class="text-3xl font-bold">{{ $t("cloudie.search.result") }}</div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router"
const route = useRoute()
const query = route.params.query
</script>