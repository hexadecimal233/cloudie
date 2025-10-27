import { relations } from "drizzle-orm"
import { sqliteTable, integer, text, unique } from "drizzle-orm/sqlite-core"

export const localTracks = sqliteTable("LocalTracks", {
  trackId: integer("trackId").primaryKey().notNull(),
  meta: text("meta").notNull(),
})

export const playlists = sqliteTable("Playlists", {
  playlistId: text("playlistId").primaryKey().notNull(),
  meta: text("meta").notNull(),
})

/**
 * Download tasks table:
 * - taskId: Unique id for each download task
 * - trackId: The exact id from SoundCloud
 * - playlistId:
 *   Since soundcloud returns a urn for system playlists, we need to modify normal playlist ids a string.
 *   - playlist: "12345678"
 *   - system_playlist: "soundcloud:system-playlists:personalized-tracks:12345:67890"
 * - timestamp: Task create time
 * - origFileName: Direct Link filename, Nulls if not available
 * - path: Download Path
 * - status: Download Status
 */
export const downloadTasks = sqliteTable(
  "DownloadTasks",
  {
    taskId: integer("taskId").primaryKey({ autoIncrement: true }).notNull(),
    trackId: integer("trackId")
      .references(() => localTracks.trackId)
      .notNull(),
    playlistId: text("playlistId")
      .references(() => playlists.playlistId)
      .notNull(),
    timestamp: integer("timestamp").notNull(),
    origFileName: text("origFileName"),
    path: text("path").notNull(),
    status: text("status", {
      enum: ["paused", "completed", "failed"],
    }).notNull(),
  },
  (table) => [unique().on(table.trackId, table.playlistId)],
)

export const listeningList = sqliteTable("ListeningList", {
  trackId: integer("trackId")
    .references(() => localTracks.trackId)
    .primaryKey()
    .notNull(),
  index: integer("index").notNull(),
})

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
