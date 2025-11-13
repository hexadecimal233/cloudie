PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_M3U8Cache` (
	`trackId` integer PRIMARY KEY NOT NULL,
	`m3u8` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_M3U8Cache`("trackId", "m3u8") SELECT "trackId", "m3u8" FROM `M3U8Cache`;--> statement-breakpoint
DROP TABLE `M3U8Cache`;--> statement-breakpoint
ALTER TABLE `__new_M3U8Cache` RENAME TO `M3U8Cache`;--> statement-breakpoint
PRAGMA foreign_keys=ON;