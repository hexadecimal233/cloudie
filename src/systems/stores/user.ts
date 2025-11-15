// File to manage liked tracks, playlists, followed users, and basic user information
import {
  getMe,
  getFollowingIds,
  useMeTrackLikeIds,
  useMePlaylistLikeIds,
  getFollowersIds,
  useMeTrackRepostIds,
  useMePlaylistRepostIds,
  follow,
  unfollow,
  likeTrack,
  unlikeTrack,
  repostTrack,
  unrepostTrack,
  likePlaylist,
  unlikePlaylist,
  repostPlaylist,
  unrepostPlaylist,
  useMeSystemPlaylistLikeUrns,
  unlikeSystemPlaylist,
  likeSystemPlaylist,
} from "@/utils/api"
import { defineStore } from "pinia"
import { i18n } from "../i18n"

class UserState {
  // TODO: logged off support
  isLoggedIn: boolean = false
  id: number = -1
  username: string = ""
  avatar_url: string = ""
  permalink: string = ""
  followersIds: number[] = []
  followingIds: number[] = []
  likedTrackIds: number[] = []
  likedPlaylistIds: number[] = []
  likedSystemPlaylistUrns: string[] = []
  repostedTrackIds: number[] = []
  repostedPlaylistIds: number[] = []
  // auto data update
  timer: number | null = null // the vscode wanted me to set the type as nodejs.timeout
  lastUpdateTime: number = 0
  updateIntervalMs: number = 10 * 60 * 1000
}

export const useUserStore = defineStore("user", {
  persist: true,
  state: (): UserState => {
    return {
      ...new UserState(),
    }
  },
  getters: {
    isLikedTrack: (state) => (id: number) => state.likedTrackIds.includes(id),
    isLikedPlaylist: (state) => (id: number) => state.likedPlaylistIds.includes(id),
    isLikedSystemPlaylist: (state) => (urn: string) => state.likedSystemPlaylistUrns.includes(urn),
    isFollowingUser: (state) => (id: number) => state.followingIds.includes(id),
    isRepostedTrack: (state) => (id: number) => state.repostedTrackIds.includes(id),
    isRepostedPlaylist: (state) => (id: number) => state.repostedPlaylistIds.includes(id),
  },
  actions: {
    async updateUserInfo() {
      try {
        const res = await getMe()
        this.isLoggedIn = true
        this.id = res.id
        this.username = res.username
        this.avatar_url = res.avatar_url
        this.permalink = res.permalink
      } catch (err) {
        console.error("Get UserInfo Error", err)
        // TODO: some sort of log out logic (like cleaning the oauth token kinda brutal but wanna make sure its a 401 or 403 and we do this)
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.userInfoErr"),
          description: err as string,
        })
        return new UserState()
      }
    },

    async updateLikedTrackIds() {
      try {
        const trackLikeCollection = useMeTrackLikeIds()
        const ids: number[] = []
        do {
          await trackLikeCollection.fetchNext()
          ids.push(...trackLikeCollection.data.value)
        } while (trackLikeCollection.hasNext.value && !trackLikeCollection.error.value)
        this.likedTrackIds = ids
      } catch (err) {
        console.error("Failed to update liked track IDs:", err)
      }
    },

    async updateLikedPlaylistIds() {
      try {
        this.likedPlaylistIds = await useMePlaylistLikeIds()
      } catch (err) {
        console.error("Failed to update liked playlist IDs:", err)
      }
    },

    async updateLikedSystemPlaylistUrns() {
      try {
        this.likedSystemPlaylistUrns = await useMeSystemPlaylistLikeUrns()
      } catch (err) {
        console.error("Failed to update liked system playlist Urns:", err)
      }
    },

    async updateFollowersIds() {
      try {
        this.followersIds = await getFollowersIds()
      } catch (err) {
        console.error("Failed to update followers IDs:", err)
      }
    },

    async updateFollowingIds() {
      try {
        this.followingIds = await getFollowingIds(this.id)
      } catch (err) {
        console.error("Failed to update following IDs:", err)
      }
    },

    async updateRepostedTrackIds() {
      try {
        this.repostedTrackIds = await useMeTrackRepostIds()
      } catch (err) {
        console.error("Failed to update reposted track IDs:", err)
      }
    },

    async updateRepostedPlaylistIds() {
      try {
        this.repostedPlaylistIds = await useMePlaylistRepostIds()
      } catch (err) {
        console.error("Failed to update reposted playlist IDs:", err)
      }
    },

    updateAllUserData() {
      if (!this.isLoggedIn) return

      Promise.all([
        this.updateUserInfo(),
        this.updateLikedTrackIds(),
        this.updateLikedPlaylistIds(),
        this.updateLikedSystemPlaylistUrns(),
        this.updateFollowingIds(),
        this.updateRepostedTrackIds(),
        this.updateRepostedPlaylistIds(),
      ]).then(() => {
        this.lastUpdateTime = Date.now()
        console.log("User data updated at", new Date(this.lastUpdateTime))
      })
    },

    async initializeUserState() {
      await this.updateAllUserData()
      this.startPeriodicUpdate()
    },

    startPeriodicUpdate() {
      this.stopPeriodicUpdate()

      this.timer = setInterval(async () => {
        await this.updateAllUserData()
      }, this.updateIntervalMs)

      console.log(`Periodic user data update started with interval: ${this.updateIntervalMs}ms`)
    },

    stopPeriodicUpdate() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
        console.log("Periodic user data update stopped")
      }
    },

    $dispose() {
      this.stopPeriodicUpdate()
    },

    // User action methods that call API functions and update local state
    async toggleLikeTrack(id: number) {
      try {
        if (this.isLikedTrack(id)) {
          await unlikeTrack(id)

          const index = this.likedTrackIds.indexOf(id)
          if (index > -1) {
            this.likedTrackIds.splice(index, 1)
          }
        } else {
          await likeTrack(id)

          if (!this.isLikedTrack(id)) {
            this.likedTrackIds.push(id)
          }
        }
      } catch (err) {
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.likeTrackErr"),
          description: err as string,
        })
      }
    },

    async toggleLikePlaylist(id: number) {
      try {
        if (this.isLikedPlaylist(id)) {
          await unlikePlaylist(id)

          const index = this.likedPlaylistIds.indexOf(id)
          if (index > -1) {
            this.likedPlaylistIds.splice(index, 1)
          }
        } else {
          await likePlaylist(id)

          if (!this.isLikedPlaylist(id)) {
            this.likedPlaylistIds.push(id)
          }
        }
      } catch (err) {
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.likePlaylistErr"),
          description: err as string,
        })
      }
    },

    async toggleLikeSystemPlaylist(urn: string) {
      try {
        if (this.isLikedSystemPlaylist(urn)) {
          await unlikeSystemPlaylist(urn)

          const index = this.likedSystemPlaylistUrns.indexOf(urn)
          if (index > -1) {
            this.likedSystemPlaylistUrns.splice(index, 1)
          }
        } else {
          await likeSystemPlaylist(urn)

          if (!this.isLikedSystemPlaylist(urn)) {
            this.likedSystemPlaylistUrns.push(urn)
          }
        }
      } catch (err) {
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.likeSystemPlaylistErr"),
          description: err as string,
        })
      }
    },

    async toggleFollowUser(id: number) {
      try {
        if (this.isFollowingUser(id)) {
          await unfollow(id)

          const index = this.followingIds.indexOf(id)
          if (index > -1) {
            this.followingIds.splice(index, 1)
          }
        } else {
          await follow(id)

          if (!this.isFollowingUser(id)) {
            this.followingIds.push(id)
          }
        }
      } catch (err) {
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.followUserErr"),
          description: err as string,
        })
      }
    },

    async toggleRepostTrack(id: number) {
      try {
        if (this.isRepostedTrack(id)) {
          await unrepostTrack(id)

          const index = this.repostedTrackIds.indexOf(id)
          if (index > -1) {
            this.repostedTrackIds.splice(index, 1)
          }
        } else {
          await repostTrack(id)

          if (!this.isRepostedTrack(id)) {
            this.repostedTrackIds.push(id)
          }
        }
      } catch (err) {
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.repostTrackErr"),
          description: err as string,
        })
      }
    },

    async toggleRepostPlaylist(id: number) {
      try {
        if (this.isRepostedPlaylist(id)) {
          await unrepostPlaylist(id)

          const index = this.repostedPlaylistIds.indexOf(id)
          if (index > -1) {
            this.repostedPlaylistIds.splice(index, 1)
          }
        } else {
          await repostPlaylist(id)

          if (!this.isRepostedPlaylist(id)) {
            this.repostedPlaylistIds.push(id)
          }
        }
      } catch (err) {
        useToast().add({
          color: "error",
          title: i18n.global.t("skye.toasts.repostPlaylistErr"),
          description: err as string,
        })
      }
    },
  },
})
