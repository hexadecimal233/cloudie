import Hls from "hls.js"
import type {
  Loader,
  LoaderConfiguration,
  LoaderCallbacks,
  LoaderStats,
  FragmentLoaderContext,
} from "hls.js"
import { M3U8_CACHE_MANAGER } from "./cache"
import { getCurrentTrack } from "./listening-list"

export class CachedLoader implements Loader<FragmentLoaderContext> {
  private loader: Loader<FragmentLoaderContext>

  constructor(config: any) {
    this.loader = new Hls.DefaultConfig.loader(config) as Loader<FragmentLoaderContext>
  }

  get stats(): LoaderStats {
    return this.loader.stats
  }

  get context(): FragmentLoaderContext | null {
    return this.loader.context
  }

  destroy(): void {
    this.loader.destroy()
  }

  abort(): void {
    this.loader.abort()
  }

  load(
    context: FragmentLoaderContext,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<FragmentLoaderContext>,
  ): void {
    // ignore non-fragment requests
    if (!context.frag) {
      this.loader.load(context, config, callbacks)
      return
    }

    ;(async () => {
      const trackId = getCurrentTrack().id

      const cache = await M3U8_CACHE_MANAGER.getSegmentCache(trackId, context.url)

      if (cache) {
        setTimeout(() => {
          callbacks.onSuccess({ url: context.url, data: cache }, this.loader.stats, context, null)
        }, 0)
        return
      }

      const originalOnSuccess = callbacks.onSuccess
      callbacks.onSuccess = (response, stats, context, networkDetails) => {
        if (response.data instanceof ArrayBuffer) {
          M3U8_CACHE_MANAGER.setSegmentCache(trackId, context.url, response.data)
        }

        // originalOnSuccess
        originalOnSuccess(response, stats, context, networkDetails)
      }

      this.loader.load(context, config, callbacks)
    })().catch((error: any) => {
      callbacks.onError({ code: -1, text: error.message }, context, null, this.loader.stats)
    })
  }
}
