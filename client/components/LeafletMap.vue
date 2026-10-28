<template>
  <div
    ref="mapContainer"
    class="w-full flex-1 rounded-lg border border-slate-200 bg-slate-100 relative min-h-[420px] overflow-hidden z-10"
  ></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMapInstance } from 'leaflet';
import type { CampusMapMarker, MapCoordinates } from '~/types';

const props = defineProps<{
  center: MapCoordinates;
  zoom: number;
  markers: CampusMapMarker[];
}>();

const emit = defineEmits<{
  'center-change': [center: MapCoordinates];
  'zoom-change': [zoom: number];
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let mapInstance: LeafletMapInstance | null = null;
let resizeObserver: ResizeObserver | null = null;

const isOnline = ref(true);
const serviceWorkerControlled = ref(false);
const cachedTileCount = ref(0);
const tileLoadErrors = ref(0);
const cacheStatusError = ref('');
let cacheStatusTimer: ReturnType<typeof setTimeout> | undefined;

const handleResize = () => {
  mapInstance?.invalidateSize({ pan: false });
};

const refreshTileCacheStatus = async () => {
  try {
    const cacheStorage = typeof window !== 'undefined' ? window.caches : undefined;
    const status = await getMapTileCacheStatus(
      typeof navigator !== 'undefined'
        ? navigator.serviceWorker?.controller ?? null
        : null,
      cacheStorage,
    );

    serviceWorkerControlled.value = status.serviceWorkerControlled;
    cachedTileCount.value = status.tileCount;
    cacheStatusError.value = '';
  } catch (error) {
    console.error('Unable to inspect the offline map tile cache.', error);
    cacheStatusError.value =
      'Unable to inspect the offline map cache. Check browser storage permissions and reload.';
  }
};

const scheduleTileCacheStatusRefresh = () => {
  if (cacheStatusTimer) clearTimeout(cacheStatusTimer);
  cacheStatusTimer = setTimeout(refreshTileCacheStatus, 500);
};

const updateNetworkStatus = () => {
  isOnline.value = navigator.onLine;
};

onMounted(async () => {
  isOnline.value = navigator.onLine;
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      refreshTileCacheStatus,
    );
  }
  void refreshTileCacheStatus();

  const { default: L } = await import('leaflet');
  const container = mapContainer.value;
  if (!container) return;

  const map = L.map(container).setView(
    [props.center.lat, props.center.lng],
    props.zoom,
  );
  mapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
})
  .on('tileload', scheduleTileCacheStatusRefresh)
  .on('tileerror', () => {
    tileLoadErrors.value += 1;
  })
  .addTo(map);

  props.markers.forEach((marker) => {
    L.marker(marker.coords)
      .addTo(map)
      .bindPopup(`<b>${marker.name}</b><br><span style="font-size: 11px; color: #666;">${marker.category}</span>`);
  });

  map.on('zoomend', () => emit('zoom-change', map.getZoom()));
  map.on('moveend', () => {
    const center = map.getCenter();
    emit('center-change', { lat: center.lat, lng: center.lng });
  });

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  } else {
    window.addEventListener('resize', handleResize);
  }
});

watch(
  () => [props.center.lat, props.center.lng, props.zoom] as const,
  ([lat, lng, zoom]) => {
    if (!mapInstance) return;

    const currentCenter = mapInstance.getCenter();
    if (currentCenter.lat !== lat || currentCenter.lng !== lng || mapInstance.getZoom() !== zoom) {
      mapInstance.setView([lat, lng], zoom);
    }
  },
);

function focusAnchor(anchor: CampusMapMarker) {
  mapInstance?.flyTo(anchor.coords, 18, { duration: 1.2 });
}

defineExpose({ focusAnchor });

onBeforeUnmount(() => {
  window.removeEventListener('online', updateNetworkStatus);
  window.removeEventListener('offline', updateNetworkStatus);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener(
      'controllerchange',
      refreshTileCacheStatus,
    );
  }

  if (cacheStatusTimer) clearTimeout(cacheStatusTimer);
  resizeObserver?.disconnect();
  window.removeEventListener('resize', handleResize);
  mapInstance?.remove();
  mapInstance = null;
});
</script>
