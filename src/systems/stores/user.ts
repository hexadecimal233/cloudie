// File to manage liked tracks, playlists, followed users, and basic user information
import { getMe, getFollowingIds, useMeTrackLikeIds, useMePlaylistLikeIds, getFollowersIds } from "@/utils/api"
import { defineStore } from "pinia"
import { toast } from "vue-sonner"
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
        toast.error(i18n.global.t("cloudie.toasts.userInfoErr"), { description: err as string })
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
    
    async updateAllUserData() {
      if (!this.isLoggedIn) return
      
      await Promise.all([
        this.updateUserInfo(),
        this.updateLikedTrackIds(),
        this.updateLikedPlaylistIds(),
        this.updateFollowingIds()
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
    }
  },
})
