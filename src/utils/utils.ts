export function replaceImageUrl(url: string, size: number = 500) {
  /*
  availableSizes: [[20, "t20x20"], [50, "t50x50"], [120, "t120x120"], [200, "t200x200"], [500, "t500x500"], [1080, "t1080x1080"]],
  availableVisualsSizes: [[1240, "t1240x260"], [2480, "t2480x520"]],
  */
  return url.replace("-large", `-t${size}x${size}`)
}

export function formatMillis(millis: number) {
  const seconds = Math.floor(millis / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const formattedMinutes = (minutes % 60).toString().padStart(2, "0")
  const formattedSeconds = (seconds % 60).toString().padStart(2, "0")

  return `${hours > 0 ? `${hours}:` : ""}${formattedMinutes}:${formattedSeconds}`
}

export function checkFFmpeg() {
  // TODO: 检查 ffmpeg 是否存在
}

export function getArtist(track: any): string {
  return track.publisher_metadata?.artist ?? track.user?.username ?? ""
}

export function getCoverUrl(track: any): string {
  return track.artwork_url ?? track.user?.avatar_url ?? ""
}
