<template>
  <UContextMenu :items="items">
    <div>
    <component :is="renderContent()" />
    </div>
  </UContextMenu>
</template>

<script setup lang="tsx">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

const items = computed(() => [
  {
    label: useI18n().t("skye.common.copy"),
    action: () => {
      navigator.clipboard.writeText(props.content) // FIXME: Copy fails
    },
  },
])

const props = defineProps<{
  content: string
}>()

function renderContent() {
  // Split content into parts to handle @mentions and regular links separately
  const parts = parseContent(props.content)

  return () => {
    return parts.map((part, index) => {
      if (part.type === "mention") {
        // Use ULink for @mentions to user profiles
        return (
          <ULink
            key={index}
            to={`/user/${part.username}`}
            class="text-primary hover:text-primary-600">
            @{part.username}
          </ULink>
        )
      } else if (part.type === "link") {
        // Use regular <a> tag for external links
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:text-primary-600 underline">
            {part.text || part.url}
          </a>
        )
      } else {
        // Regular text
        return part.text
      }
    })
  }
}

function parseContent(content: string): Array<{
  type: "text" | "mention" | "link"
  text?: string
  username?: string
  url?: string
}> {
  const parts: Array<{
    type: "text" | "mention" | "link"
    text?: string
    username?: string
    url?: string
  }> = []

  // Regex patterns
  const mentionPattern = /@([a-zA-Z0-9_-]+)/g
  const urlPattern = /(https?:\/\/[^\s]+)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  // Find all matches for both patterns
  const allMatches: Array<{
    type: "mention" | "link"
    index: number
    match: RegExpExecArray
  }> = []

  // Find all mentions
  while ((match = mentionPattern.exec(content)) !== null) {
    allMatches.push({
      type: "mention",
      index: match.index,
      match,
    })
  }

  // Find all links
  while ((match = urlPattern.exec(content)) !== null) {
    allMatches.push({
      type: "link",
      index: match.index,
      match,
    })
  }

  // Sort matches by index to process in order
  allMatches.sort((a, b) => a.index - b.index)

  // Process matches
  for (const matchInfo of allMatches) {
    // Add text before this match if any
    if (matchInfo.index > lastIndex) {
      parts.push({
        type: "text",
        text: content.slice(lastIndex, matchInfo.index),
      })
    }

    if (matchInfo.type === "mention") {
      parts.push({
        type: "mention",
        username: matchInfo.match[1],
      })
    } else if (matchInfo.type === "link") {
      parts.push({
        type: "link",
        url: matchInfo.match[0],
        text: matchInfo.match[0],
      })
    }

    lastIndex = matchInfo.index + matchInfo.match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      text: content.slice(lastIndex),
    })
  }

  // If no matches were found, return the original content as text
  if (parts.length === 0) {
    parts.push({
      type: "text",
      text: content,
    })
  }

  return parts
}
</script>