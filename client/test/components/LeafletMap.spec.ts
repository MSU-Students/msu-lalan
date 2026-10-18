import { mount, flushPromises } from '@vue/test-utils';
import LeafletMap from '../../components/LeafletMap.vue';

const mockMap = {
  setView: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  getCenter: jest.fn(() => ({ lat: 8.0035, lng: 124.2621 })),
  getZoom: jest.fn(() => 16),
  invalidateSize: jest.fn(),
  remove: jest.fn(),
};

jest.mock('leaflet', () => ({
  map: jest.fn(() => mockMap),
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  marker: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
    bindPopup: jest.fn().mockReturnThis(),
  })),
}));

describe('LeafletMap', () => {
  let resizeCallback: ResizeObserverCallback | undefined;
  let observe: jest.Mock;
  let disconnect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resizeCallback = undefined;
    observe = jest.fn();
    disconnect = jest.fn();

    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = jest.fn();
    }

    global.ResizeObserver = MockResizeObserver;
  });

  const mountMap = () => mount(LeafletMap, {
    props: {
      center: { lat: 8.0035, lng: 124.2621 },
      zoom: 16,
      markers: [],
    },
  });

  it('creates the Leaflet map with the configured center and zoom', async () => {
    const wrapper = mount(LeafletMap, {
      props: {
        center: { lat: 8.1, lng: 124.4 },
        zoom: 13,
        markers: [],
      },
    });

    await flushPromises();

    expect(mockMap.setView).toHaveBeenCalledWith([8.1, 124.4], 13);
    wrapper.unmount();
  });

  it('updates the starting view when center or zoom props change', async () => {
    const wrapper = mountMap();
    await flushPromises();
    mockMap.setView.mockClear();

    await wrapper.setProps({
      center: { lat: 8.2, lng: 124.5 },
      zoom: 14,
    });

    expect(mockMap.setView).toHaveBeenCalledWith([8.2, 124.5], 14);
    wrapper.unmount();
  });

  it('invalidates the map size when the container resizes', async () => {
    const wrapper = mountMap();
    await flushPromises();

    expect(observe).toHaveBeenCalledWith(wrapper.element);
    resizeCallback?.([], {} as ResizeObserver);
    expect(mockMap.invalidateSize).toHaveBeenCalledWith({ pan: false });

    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(mockMap.remove).toHaveBeenCalled();
  });
});
