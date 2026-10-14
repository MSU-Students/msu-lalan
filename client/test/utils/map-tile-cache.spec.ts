import { getMapTileCacheStatus, MAP_TILE_CACHE_NAME } from '../../utils/map-tile-cache';

describe('getMapTileCacheStatus', () => {
  const controller = {} as ServiceWorker;

  it('reports when the current page is not controlled by a service worker', async () => {
    const status = await getMapTileCacheStatus(null, undefined);

    expect(status).toEqual({ serviceWorkerControlled: false, tileCount: 0 });
  });

  it('reports an empty cache without creating one', async () => {
    const open = jest.fn();
    const cacheStorage = {
      keys: jest.fn().mockResolvedValue(['other-cache']),
      open,
    };

    const status = await getMapTileCacheStatus(controller, cacheStorage);

    expect(status).toEqual({ serviceWorkerControlled: true, tileCount: 0 });
    expect(open).not.toHaveBeenCalled();
  });

  it('counts the cached map tile requests', async () => {
    const cacheStorage = {
      keys: jest.fn().mockResolvedValue([MAP_TILE_CACHE_NAME]),
      open: jest.fn().mockResolvedValue({
        keys: jest.fn().mockResolvedValue([{} as Request, {} as Request]),
      }),
    };

    const status = await getMapTileCacheStatus(controller, cacheStorage);

    expect(cacheStorage.open).toHaveBeenCalledWith(MAP_TILE_CACHE_NAME);
    expect(status).toEqual({ serviceWorkerControlled: true, tileCount: 2 });
  });

  it('surfaces cache storage errors to its caller', async () => {
    const error = new Error('Storage is unavailable');
    const cacheStorage = {
      keys: jest.fn().mockRejectedValue(error),
      open: jest.fn(),
    };

    await expect(getMapTileCacheStatus(controller, cacheStorage)).rejects.toBe(error);
  });
});
