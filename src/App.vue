<template>
  <Toaster closeButton closeButtonPosition="top-right" expand rich-colors />
  <ModalsContainer />
  <UApp>
    <MainView />
  </UApp>
</template>

<script setup lang="ts">
import { Toaster } from "vue-sonner"
import "vue-sonner/style.css"
import "overlayscrollbars/overlayscrollbars.css"

import MainView from "./MainView.vue"
import { Window } from "@tauri-apps/api/window"

Window.getCurrent()
  .show()
  .then(() => {
    //Window.getCurrent().setFocus()
  }) // show with delay to prevent flickering
</script>
