import { relations } from "drizzle-orm"
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core"

export const localTracks = sqliteTable("LocalTracks", {
  trackId: integer("trackId").primaryKey().notNull(),
  meta: text("meta").notNull(),
})

export const playlists = sqliteTable("Playlists", {
  playlistId: text("playlistId").primaryKey().notNull(),
  meta: text("meta").notNull(),
})

export const downloadTasks = sqliteTable("DownloadTasks", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  trackId: integer("trackId")
    .references(() => localTracks.trackId)
    .notNull(),
  playlistId: text("playlistId").references(() => playlists.playlistId),
  timestamp: integer("timestamp").notNull(),
  origFileName: text("origFileName"),
  path: text("path").notNull(),
  status: text("status", {
    enum: ["pending", "getinfo", "downloading", "paused", "completed", "failed"],
  }).notNull(),
})

export const listeningList = sqliteTable("ListeningList", {
  trackId: integer("trackId")
    .references(() => localTracks.trackId)
    .primaryKey()
    .notNull(),
  timestamp: integer("timestamp").notNull(),
})

export const localTracksRelations = relations(localTracks, ({ one }) => ({
  downloadTask: one(downloadTasks, {
    fields: [localTracks.trackId],
    references: [downloadTasks.trackId],
  }),
}))

export const playlistsRelations = relations(playlists, ({ many }) => ({
  downloadTasks: many(downloadTasks),
}))

export const downloadTasksRelations = relations(downloadTasks, ({ one }) => ({
  localTrack: one(localTracks, {
    fields: [downloadTasks.trackId],
    references: [localTracks.trackId],
  }),
  playlist: one(playlists, {
    fields: [downloadTasks.playlistId],
    references: [playlists.playlistId],
  }),
}))

export const listeningListRelations = relations(listeningList, ({ one }) => ({
  localTrack: one(localTracks, {
    fields: [listeningList.trackId],
    references: [localTracks.trackId],
  }),
}))
