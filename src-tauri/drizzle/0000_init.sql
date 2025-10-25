CREATE TABLE `DownloadTasks` (
	`taskId` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trackId` integer NOT NULL,
	`playlistId` text NOT NULL,
	`timestamp` integer NOT NULL,
	`origFileName` text,
	`path` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`trackId`) REFERENCES `LocalTracks`(`trackId`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`playlistId`) REFERENCES `Playlists`(`playlistId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `DownloadTasks_trackId_playlistId_unique` ON `DownloadTasks` (`trackId`,`playlistId`);--> statement-breakpoint
CREATE TABLE `ListeningList` (
	`trackId` integer PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`trackId`) REFERENCES `LocalTracks`(`trackId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `LocalTracks` (
	`trackId` integer PRIMARY KEY NOT NULL,
	`meta` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Playlists` (
	`playlistId` text PRIMARY KEY NOT NULL,
	`meta` text NOT NULL
);
