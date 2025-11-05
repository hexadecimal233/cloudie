import { BasePlaylist, Track } from "@/utils/types"
import { relations } from "drizzle-orm"
import { sqliteTable, integer, text, unique } from "drizzle-orm/sqlite-core"

export const localTracks = sqliteTable("LocalTracks", {
  trackId: integer().primaryKey().notNull(),
  meta: text({ mode: "json" }).$type<Track>().notNull(),
})

export const playlists = sqliteTable("Playlists", {
  playlistId: text().primaryKey().notNull(),
  meta: text({ mode: "json" }).$type<BasePlaylist>().notNull(),
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
    taskId: integer().primaryKey({ autoIncrement: true }).notNull(),
    trackId: integer()
      .references(() => localTracks.trackId)
      .notNull(),
    playlistId: text()
      .references(() => playlists.playlistId)
      .notNull(),
    timestamp: integer().notNull(),
    origFileName: text(),
    path: text().notNull(),
    status: text({
      enum: ["paused", "completed", "failed"],
    }).notNull(),
  },
  (table) => [unique().on(table.trackId, table.playlistId)],
)

export const listeningList = sqliteTable("ListeningList", {
  trackId: integer()
    .references(() => localTracks.trackId)
    .primaryKey()
    .notNull(),
  index: integer().notNull(),
})

export const m3u8Cache = sqliteTable("M3U8Cache", {
  trackId: integer()
    .references(() => localTracks.trackId)
    .primaryKey()
    .notNull(),
  m3u8: text().notNull(),
})

export const m3u8Relations = relations(m3u8Cache, ({ one }) => ({
  localTrack: one(localTracks, {
    fields: [m3u8Cache.trackId],
    references: [localTracks.trackId],
  }),
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
