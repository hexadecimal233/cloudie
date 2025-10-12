import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/feeds",
      component: () => import("./views/FeedsView.vue"),
    },
    {
      path: "/listening",
      component: () => import("./views/ListeningView.vue"),
    },
    {
      path: "/settings",
      component: () => import("./views/SettingsView.vue"),
    },
    {
      path: "/likes",
      component: () => import("./views/LikesView.vue"),
    },
    {
      path: "/history",
      component: () => import("./views/HistoryView.vue"),
    },
    {
      path: "/playlists",
      component: () => import("./views/PlaylistView.vue"),
    },
    {
      path: "/radio",
      component: () => import("./views/RadioView.vue"),
    },
    {
      path: "/downloads",
      component: () => import("./views/DownloadsView.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/feeds" },
  ],
  linkActiveClass: "menu-active",
  linkExactActiveClass: "menu-active",
})

export default router
