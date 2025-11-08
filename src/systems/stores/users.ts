// temp users (scusers） store
import { defineStore } from "pinia"
import { type SCUser } from "@/utils/types"

export const useUsersStore = defineStore("scusers", {
  state: () => ({
    users: [] as SCUser[],
  }),
  getters: {
    getUserById: (state) => (id: number) => state.users.find((user: SCUser) => user.id === id),
  },
})
