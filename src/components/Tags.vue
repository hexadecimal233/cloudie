<template>
    <div class="flex gap-2">
        <UBadge v-for="tag in tags" :key="tag" color="neutral">#{{ tag }}</UBadge>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  tags: string
}>()

function getTags() {
  if (!props.tags) return []

  // quoted tags or unquoted words
  const matches = props.tags.match(/"([^"]*)"|(\S+)/g) || []
  return matches.map((m) => m.replace(/^"|"$/g, ""))
}

const tags = getTags()
</script>