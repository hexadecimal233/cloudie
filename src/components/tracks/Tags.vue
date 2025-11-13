<template>
  <UMarquee v-if="useMarquee" class="flex gap-2">
    <UBadge v-for="tag in tags" :key="tag" variant="soft" color="neutral">#{{ tag }}</UBadge>
  </UMarquee>
  <div v-else class="flex gap-2">
    <UBadge v-for="tag in tags" :key="tag" variant="soft" color="neutral">#{{ tag }}</UBadge>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  tags: string
  useMarquee?: boolean
}>()

function getTags() {
  if (!props.tags) return []

  // quoted tags or unquoted words
  const matches = props.tags.match(/"([^"]*)"|(\S+)/g) || []
  return matches.map((m) => m.replace(/^"|"$/g, ""))
}

const tags = getTags()
</script>