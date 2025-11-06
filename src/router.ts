import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Main Pages
    {
      path: "/feeds",
      component: () => import("./views/FeedsView.vue"),
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
      component: () => import("./views/PlaylistsView.vue"),
    },
    {
      path: "/radio",
      component: () => import("./views/RadioView.vue"),
    },
    {
      path: "/downloads",
      component: () => import("./views/DownloadsView.vue"),
    },
    {
      path: "/following",
      component: () => import("./views/FollowingView.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/feeds" },
    // Dynamic Pages
    {
      path: "/playlist/:id", // the string or number id.
      component: () => import("./views/dynamic/PlaylistView.vue"),
    },
  ],
  linkActiveClass: "menu-active",
  linkExactActiveClass: "menu-active",
})

export default router
