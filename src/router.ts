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
      path: "/library",
      component: () => import("./views/LibraryView.vue"),
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
    // TODO: Separate system playlist and user playlist
    {
      path: "/playlist/:id", // the string(system-playlist) or number id.
      component: () => import("./views/dynamic/PlaylistView.vue"),
    },
    {
      path: "/track/:id",
      component: () => import("./views/dynamic/TrackView.vue"),
    },
    {
      path: "/user/:id",
      component: () => import("./views/dynamic/UserView.vue"),
    },
    {
      path: "/search/:query",
      component: () => import("./views/dynamic/SearchView.vue"),
    },
  ],
})

export default router
