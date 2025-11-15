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
  repostedTrackIds: number[] = []
  repostedPlaylistIds: number[] = []
  // auto data update
  timer: any = null // the vscode wanted me to set the type as nodejs.timeout
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
          title: i18n.global.t("cloudie.toasts.userInfoErr"),
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
        } while (trackLikeCollection.hasNext.value)
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

    async updateAllUserData() {
      if (!this.isLoggedIn) return

      await Promise.all([
        this.updateUserInfo(),
        this.updateLikedTrackIds(),
        this.updateLikedPlaylistIds(),
        this.updateFollowingIds(),
        this.updateRepostedTrackIds(),
        this.updateRepostedPlaylistIds(),
      ])

      this.lastUpdateTime = Date.now()
      console.log("User data updated at", new Date(this.lastUpdateTime))
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

    // TODO: Actual work
    // User action methods that call API functions and update local state
    async followUser(id: number) {
      try {
        await follow(id)
        if (!this.followingIds.includes(id)) {
          this.followingIds.push(id)
        }
        return true
      } catch (err) {
        console.error("Failed to follow user:", err)
        return false
      }
    },

    async unfollowUser(id: number) {
      try {
        await unfollow(id)
        const index = this.followingIds.indexOf(id)
        if (index > -1) {
          this.followingIds.splice(index, 1)
        }
        return true
      } catch (err) {
        console.error("Failed to unfollow user:", err)
        return false
      }
    },

    async likeTrackById(id: number) {
      try {
        await likeTrack(id)
        if (!this.likedTrackIds.includes(id)) {
          this.likedTrackIds.push(id)
        }
        return true
      } catch (err) {
        console.error("Failed to like track:", err)
        return false
      }
    },

    async unlikeTrackById(id: number) {
      try {
        await unlikeTrack(id)
        const index = this.likedTrackIds.indexOf(id)
        if (index > -1) {
          this.likedTrackIds.splice(index, 1)
        }
        return true
      } catch (err) {
        console.error("Failed to unlike track:", err)
        return false
      }
    },

    async repostTrackById(id: number) {
      try {
        await repostTrack(id)
        if (!this.repostedTrackIds.includes(id)) {
          this.repostedTrackIds.push(id)
        }
        return true
      } catch (err) {
        console.error("Failed to repost track:", err)
        return false
      }
    },

    async unrepostTrackById(id: number) {
      try {
        await unrepostTrack(id)
        const index = this.repostedTrackIds.indexOf(id)
        if (index > -1) {
          this.repostedTrackIds.splice(index, 1)
        }
        return true
      } catch (err) {
        console.error("Failed to unrepost track:", err)
        return false
      }
    },

    async likePlaylistById(id: number) {
      try {
        await likePlaylist(id)
        if (!this.likedPlaylistIds.includes(id)) {
          this.likedPlaylistIds.push(id)
        }
        return true
      } catch (err) {
        console.error("Failed to like playlist:", err)
        return false
      }
    },

    async unlikePlaylistById(id: number) {
      try {
        await unlikePlaylist(id)
        const index = this.likedPlaylistIds.indexOf(id)
        if (index > -1) {
          this.likedPlaylistIds.splice(index, 1)
        }
        return true
      } catch (err) {
        console.error("Failed to unlike playlist:", err)
        return false
      }
    },

    async repostPlaylistById(id: number) {
      try {
        await repostPlaylist(id)
        if (!this.repostedPlaylistIds.includes(id)) {
          this.repostedPlaylistIds.push(id)
        }
        return true
      } catch (err) {
        console.error("Failed to repost playlist:", err)
        return false
      }
    },

    async unrepostPlaylistById(id: number) {
      try {
        await unrepostPlaylist(id)
        const index = this.repostedPlaylistIds.indexOf(id)
        if (index > -1) {
          this.repostedPlaylistIds.splice(index, 1)
        }
        return true
      } catch (err) {
        console.error("Failed to unrepost playlist:", err)
        return false
      }
    },
  },
})
