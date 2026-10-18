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

const handleResize = () => {
  mapInstance?.invalidateSize({ pan: false });
};

onMounted(async () => {
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
  }).addTo(map);

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
  resizeObserver?.disconnect();
  window.removeEventListener('resize', handleResize);
  mapInstance?.remove();
  mapInstance = null;
});
</script>
