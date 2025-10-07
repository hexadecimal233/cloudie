import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/listening",
      name: "试听列表",
      component: () => import("./views/ListeningView.vue"),
    },
    {
      path: "/about",
      name: "关于",
      component: () => import("./views/AboutView.vue"),
    },
    {
      path: "/settings",
      name: "设置",
      component: () => import("./views/SettingsView.vue"),
    },
    {
      path: "/likes",
      name: "喜欢的音乐",
      component: () => import("./views/LikesView.vue"),
    },
    {
      path: "/history",
      name: "播放历史",
      component: () => import("./views/HistoryView.vue"),
    },
    {
      path: "/playlists",
      name: "歌单",
      component: () => import("./views/PlaylistView.vue"),
    },
    {
      path: "/radio",
      name: "电台",
      component: () => import("./views/RadioView.vue"),
    },
    {
      path: "/downloads",
      name: "下载队列",
      component: () => import("./views/DownloadsView.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/about" },
  ],
  linkActiveClass: "menu-active",
  linkExactActiveClass: "menu-active",
})

export default router
