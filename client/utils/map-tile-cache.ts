export const MAP_TILE_CACHE_NAME = 'osm-map-tiles-cache';

export interface MapTileCacheStatus {
  serviceWorkerControlled: boolean;
  tileCount: number;
}

export async function getMapTileCacheStatus(
  controller: ServiceWorker | null,
  cacheStorage: Pick<CacheStorage, 'keys' | 'open'> | undefined,
): Promise<MapTileCacheStatus> {
  if (!controller || !cacheStorage) {
    return { serviceWorkerControlled: Boolean(controller), tileCount: 0 };
  }

  const cacheNames = await cacheStorage.keys();
  if (!cacheNames.includes(MAP_TILE_CACHE_NAME)) {
    return { serviceWorkerControlled: true, tileCount: 0 };
  }

  const tileCache = await cacheStorage.open(MAP_TILE_CACHE_NAME);
  const tileRequests = await tileCache.keys();

  return { serviceWorkerControlled: true, tileCount: tileRequests.length };
}
