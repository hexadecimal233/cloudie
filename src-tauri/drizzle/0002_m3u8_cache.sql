CREATE TABLE `M3U8Cache` (
	`trackId` integer PRIMARY KEY NOT NULL,
	`m3u8` text NOT NULL,
	FOREIGN KEY (`trackId`) REFERENCES `LocalTracks`(`trackId`) ON UPDATE no action ON DELETE no action
);
