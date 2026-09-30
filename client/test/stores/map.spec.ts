import { setActivePinia, createPinia } from 'pinia';
import { useMapStore } from '../../stores/map';

describe('useMapStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with MSU Main Campus default coordinates', () => {
    const mapStore = useMapStore();
    expect(mapStore.center.lat).toBeCloseTo(8.0035);
    expect(mapStore.center.lng).toBeCloseTo(124.2621);
    expect(mapStore.zoom).toBe(16);
    expect(mapStore.isGpsTracking).toBe(false);
  });

  it('should update center coordinates and zoom level', () => {
    const mapStore = useMapStore();
    mapStore.setCenter({ lat: 8.0051, lng: 124.2612 });
    mapStore.setZoom(18);

    expect(mapStore.center.lat).toBeCloseTo(8.0051);
    expect(mapStore.center.lng).toBeCloseTo(124.2612);
    expect(mapStore.zoom).toBe(18);
  });

  it('should toggle GPS tracking state', () => {
    const mapStore = useMapStore();
    expect(mapStore.isGpsTracking).toBe(false);
    mapStore.toggleGpsTracking();
    expect(mapStore.isGpsTracking).toBe(true);
    mapStore.toggleGpsTracking();
    expect(mapStore.isGpsTracking).toBe(false);
  });

  it('should reset back to campus center', () => {
    const mapStore = useMapStore();
    mapStore.setCenter({ lat: 8.1, lng: 124.5 });
    mapStore.setZoom(12);

    mapStore.resetToCampusCenter();
    expect(mapStore.center.lat).toBeCloseTo(8.0035);
    expect(mapStore.center.lng).toBeCloseTo(124.2621);
    expect(mapStore.zoom).toBe(16);
  });
});
