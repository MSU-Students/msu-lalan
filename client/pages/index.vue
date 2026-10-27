<template>
  <div class="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
    <!-- Left Panel: Directory & Sprint 0 Controls -->
    <div class="w-full md:w-1/3 flex flex-col gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 class="text-xl font-bold text-slate-800 mb-1">Walking route planner</h2>
        <p class="text-xs text-slate-500 mb-4">
          Get a route from your current location to a mapped campus point.
        </p>

        <div class="space-y-3">
          <button
            type="button"
            :disabled="isFindingLocation"
            @click="useCurrentLocation"
            class="w-full rounded-lg bg-msu-maroon px-3 py-2.5 text-sm font-semibold text-white hover:bg-msu-maroon-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ isFindingLocation ? 'Finding your location...' : 'Use my current location' }}
          </button>
          <button
            type="button"
            :class="isPickingStart ? 'border-msu-maroon bg-red-50 text-msu-maroon' : 'border-slate-200 bg-white text-slate-700'"
            class="w-full rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            @click="togglePickStart"
          >
            {{ isPickingStart ? 'Click the map to set your start' : 'Or choose a start point on the map' }}
          </button>

          <p v-if="startLocation" class="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">
            Start set: {{ startLocation.latitude.toFixed(5) }}, {{ startLocation.longitude.toFixed(5) }}
          </p>
          <p v-else class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Allow location access, or choose a start point on the map.
          </p>

          <div>
            <label for="destination" class="mb-1 block text-xs font-semibold text-slate-700">Destination</label>
            <select
              id="destination"
              v-model="destinationNodeId"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              :disabled="isLoadingLocations || locations.length === 0"
              @change="clearRoute"
            >
              <option value="" disabled>
                {{ isLoadingLocations ? 'Loading campus locations...' : 'Choose a mapped location' }}
              </option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}{{ location.hasOutgoingRoute ? '' : ' (no connected paths yet)' }}
              </option>
            </select>
          </div>

          <button
            type="button"
            :disabled="isFindingRoute || !startLocation || !destinationNodeId"
            @click="findRoute"
            class="w-full rounded-lg bg-msu-gold px-3 py-2.5 text-sm font-bold text-msu-maroon hover:bg-msu-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isFindingRoute ? 'Finding route...' : 'Find walking route' }}
          </button>

          <p
            v-if="routeError"
            class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {{ routeError }}
          </p>
          <div
            v-if="routeSummary"
            class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            <p class="font-semibold">{{ routeSummary.destinationName }}</p>
            <p>Mapped route: {{ formatDistance(routeSummary.distanceInMeters) }}</p>
            <p v-if="routeSummary.snapDistanceInMeters > 10" class="mt-1 text-xs">
              Nearest mapped path is about {{ formatDistance(routeSummary.snapDistanceInMeters) }} from your start.
              This short connector is an estimate, not mapped walking-path data.
            </p>
          </div>

          <p class="text-[11px] leading-4 text-amber-800">
            Demo graph notice: only the currently mapped paths are routable. Some campus locations may have no route.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 class="text-xl font-bold text-slate-800 mb-1">{{ pageTitle }}</h2>
        <p class="text-xs text-slate-500 mb-4">{{ campusAddress }}</p>

        <!-- Map Controls -->
        <div class="grid grid-cols-2 gap-2 mb-4">
          <button
            @click="mapStore.resetToCampusCenter()"
            class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer"
          >
            📍 Center 
          </button>
          <button
            @click="mapStore.toggleGpsTracking()"
            :class="mapStore.isGpsTracking ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
            class="px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer"
          >
            🧭 {{ mapStore.isGpsTracking ? 'GPS Active' : 'Enable GPS' }}
          </button>
        </div>

        <div class="border-t border-slate-100 pt-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Core Pilars</h3>
          <ul class="space-y-2 text-xs">
            <li v-for="item in pilarStore.pilars" class="flex items-center gap-2 text-emerald-700 font-medium">
              <span class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">✓</span>
              {{ item }}
            </li>
          </ul>
          <input v-model="newPilar" @keydown.enter="onEnterPilar" class="my-input" />
          {{ newPilar }}
        </div>
      </div>

      <!-- Quick Directory Preview -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 class="text-sm font-bold text-slate-800 mb-3">Key Campus Anchors (Sprint 0 Baseline)</h3>
        <div class="space-y-2">
          <div
            v-for="anchor in sampleAnchors"
            :key="anchor.id"
            @click="focusAnchor(anchor)"
            class="p-2.5 rounded-lg border border-slate-100 hover:border-msu-gold hover:bg-amber-50/40 transition-colors cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">{{ anchor.name }}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{{ anchor.category }}</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">{{ anchor.coords[0].toFixed(4) }}° N, {{ anchor.coords[1].toFixed(4) }}° E</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Interactive Leaflet Map Canvas -->
    <div class="w-full md:w-2/3 flex flex-col">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col min-h-[480px]">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-base font-bold text-slate-800">MSU Lalan Geospatial Canvas</h2>
            <p class="text-xs text-slate-500">Leaflet.js & OpenStreetMap Tile Layer (Offline-Ready via PWA Cache)</p>
          </div>
          <div class="text-xs text-slate-600 font-mono bg-slate-100 px-3 py-1 rounded-md">
            Zoom: {{ mapStore.zoom }}x
          </div>
        </div>
        <div
          class="mb-3 rounded-lg border px-3 py-2 text-xs"
          :class="isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'"
          role="status"
          aria-live="polite"
        >
          <p class="font-semibold">{{ isOnline ? 'Online' : 'Offline' }}</p>
          <p v-if="cacheStatusError">{{ cacheStatusError }}</p>
          <p v-else-if="!serviceWorkerControlled">
            Offline tile caching is not active on this page. Open the production app over localhost or HTTPS, then reload after the service worker installs.
          </p>
          <p v-else-if="cachedTileCount === 0">
            No map tiles are cached yet. Browse the map while online; only areas you have viewed are available offline.
          </p>
          <p v-else>{{ cachedTileCount }} map tiles cached. Previously viewed areas can render offline; uncached areas may be blank.</p>
          <p v-if="tileLoadErrors > 0" class="mt-1">
            Some tiles could not load. If offline, those areas may not be cached; reconnect and view them to cache them.
          </p>
        </div>

        <!-- Map Leaflet DOM Target Container -->
        <ClientOnly>
          <div id="msu-map-container" class="w-full flex-1 rounded-lg border border-slate-200 bg-slate-100 relative min-h-[420px] overflow-hidden z-10"></div>
          <template #fallback>
            <div class="w-full flex-1 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
              Loading Leaflet Campus Canvas...
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { useMapStore } from '../stores/map';
import { getMapTileCacheStatus } from '../utils/map-tile-cache';
import { usePilarStore } from '~/stores/pilar';

const mapStore = useMapStore();
const pilarStore = usePilarStore();
interface CampusLocation {
  id: string;
  name: string;
  nodeType: string;
  coordinates: [number, number];
  hasOutgoingRoute: boolean;
}

interface RouteApiResult {
  found: boolean;
  reason?: 'NO_ROUTE' | 'START_TOO_FAR';
  distanceInMeters?: number;
  coordinates?: [number, number][];
  snapDistanceInMeters?: number;
  startConnectorCoordinates?: [number, number][];
  destinationNodeId?: string;
}

let mapInstance: LeafletMap | null = null;
let routeLayer: LayerGroup | null = null;
const isOnline = ref(true);
const serviceWorkerControlled = ref(false);
const cachedTileCount = ref(0);
const tileLoadErrors = ref(0);
const cacheStatusError = ref('');
const locations = ref<CampusLocation[]>([]);
const destinationNodeId = ref('');
const startLocation = ref<{ latitude: number; longitude: number } | null>(null);
const isLoadingLocations = ref(false);
const isFindingLocation = ref(false);
const isFindingRoute = ref(false);
const isPickingStart = ref(false);
const routeError = ref('');
const routeSummary = ref<{
  destinationName: string;
  distanceInMeters: number;
  snapDistanceInMeters: number;
} | null>(null);
let cacheStatusTimer: ReturnType<typeof setTimeout> | undefined;
const apiBaseUrl = useRuntimeConfig().public.apiBaseUrl;

const pageTitle = 'MSU Marawi Campus'; 
const campusAddress = 'Marawi City, Lanao del Sur 8.0035° N, 124.2621° E';

const newPilar = ref('Sample');
function onEnterPilar() {
  pilarStore.addNewPilar(newPilar.value);
}
const sampleAnchors = ref([
  { id: '1', name: 'MSU Commercial Center (Agora)', category: 'Commercial', coords: [8.0035, 124.2621] },
  { id: '2', name: 'College of Information & Computing Sciences (CICS)', category: 'Academic', coords: [8.0042, 124.2635] },
  { id: '3', name: 'MSU Senate / Administration Building', category: 'Administrative', coords: [8.0051, 124.2612] },
  { id: '4', name: 'Dimaporo Gymnasium', category: 'Sports', coords: [8.0028, 124.2605] },
  { id: '5', name: 'MSU Peace Park', category: 'Landmark', coords: [8.0062, 124.2589] },
]);

const refreshTileCacheStatus = async () => {
  try {
    const cacheStorage = typeof window !== 'undefined' ? window.caches : undefined;
    const status = await getMapTileCacheStatus(
      typeof navigator !== 'undefined' ? navigator.serviceWorker?.controller ?? null : null,
      cacheStorage,
    );
    serviceWorkerControlled.value = status.serviceWorkerControlled;
    cachedTileCount.value = status.tileCount;
    cacheStatusError.value = '';
  } catch (error) {
    console.error('Unable to inspect the offline map tile cache.', error);
    cacheStatusError.value = 'Unable to inspect the offline map cache. Check browser storage permissions and reload.';
  }
};

const scheduleTileCacheStatusRefresh = () => {
  if (cacheStatusTimer) clearTimeout(cacheStatusTimer);
  cacheStatusTimer = setTimeout(refreshTileCacheStatus, 500);
};

const updateNetworkStatus = () => {
  isOnline.value = navigator.onLine;
};

const loadLocations = async () => {
  isLoadingLocations.value = true;
  try {
    const response = await fetch(`${apiBaseUrl}/navigation/locations`);
    if (!response.ok) throw new Error('Unable to load campus destinations from the API.');
    locations.value = await response.json() as CampusLocation[];
  } catch (error) {
    console.error('Unable to load campus navigation locations.', error);
    routeError.value = 'Could not load mapped destinations. Check that the API is running, then reload.';
  } finally {
    isLoadingLocations.value = false;
  }
};

const setStartLocation = (latitude: number, longitude: number) => {
  startLocation.value = { latitude, longitude };
  routeSummary.value = null;
  routeError.value = '';
  if (routeLayer && mapInstance) {
    routeLayer.clearLayers();
  }
  mapInstance?.setView([latitude, longitude], Math.max(mapInstance.getZoom(), 17));
};

const useCurrentLocation = () => {
  if (!navigator.geolocation) {
    routeError.value = 'This browser does not support location access. Choose a start point on the map instead.';
    return;
  }

  isFindingLocation.value = true;
  routeError.value = '';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      setStartLocation(coords.latitude, coords.longitude);
      isFindingLocation.value = false;
    },
    (error) => {
      routeError.value = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Allow it in your browser settings or choose a start point on the map.'
        : 'Could not determine your location. Try again or choose a start point on the map.';
      isFindingLocation.value = false;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  );
};

const togglePickStart = () => {
  isPickingStart.value = !isPickingStart.value;
  routeError.value = '';
};

const clearRoute = () => {
  routeSummary.value = null;
  routeError.value = '';
  routeLayer?.clearLayers();
};

const findRoute = async () => {
  if (!startLocation.value || !destinationNodeId.value || isFindingRoute.value) return;

  isFindingRoute.value = true;
  routeError.value = '';
  routeSummary.value = null;
  try {
    const response = await fetch(`${apiBaseUrl}/navigation/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLatitude: startLocation.value.latitude,
        startLongitude: startLocation.value.longitude,
        destinationNodeId: destinationNodeId.value,
      }),
    });

    if (!response.ok) {
      throw new Error('The route service could not process this request. Check the selected location and try again.');
    }

    const result = await response.json() as RouteApiResult;
    routeLayer?.clearLayers();

    if (!result.found) {
      routeError.value = result.reason === 'START_TOO_FAR'
        ? 'Your start is too far from the currently mapped paths. Choose a point closer to the campus sample graph.'
        : 'No mapped walking route connects your start to this destination yet.';
      return;
    }

    if (!mapInstance || !routeLayer || !result.coordinates?.length) {
      throw new Error('The map is not ready to display the route. Please reload and try again.');
    }

    const L = (await import('leaflet')).default;
    const routeLatLngs = result.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
    L.polyline(routeLatLngs, {
      color: '#800000',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    if (result.startConnectorCoordinates && (result.snapDistanceInMeters ?? 0) > 10) {
      const connectorLatLngs = result.startConnectorCoordinates
        .map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
      L.polyline(connectorLatLngs, {
        color: '#64748b',
        weight: 3,
        dashArray: '6 8',
      }).addTo(routeLayer);
    }

    L.circleMarker([startLocation.value.latitude, startLocation.value.longitude], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2563eb',
      fillOpacity: 1,
    }).bindPopup('Your start location').addTo(routeLayer);

    const destination = locations.value.find((location) => location.id === destinationNodeId.value);
    if (destination) {
      L.marker([destination.coordinates[1], destination.coordinates[0]])
        .bindPopup(destination.name)
        .addTo(routeLayer);
      routeSummary.value = {
        destinationName: destination.name,
        distanceInMeters: result.distanceInMeters ?? 0,
        snapDistanceInMeters: result.snapDistanceInMeters ?? 0,
      };
    }

    const visibleLatLngs = [...routeLatLngs, [startLocation.value.latitude, startLocation.value.longitude] as [number, number]];
    mapInstance.fitBounds(L.latLngBounds(visibleLatLngs), { padding: [40, 40] });
  } catch (error) {
    console.error('Unable to find a walking route.', error);
    routeError.value = error instanceof Error ? error.message : 'Unable to find a route. Please try again.';
  } finally {
    isFindingRoute.value = false;
  }
};

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

const initMap = async () => {
  if (typeof window === 'undefined') return;
  const L = (await import('leaflet')).default;

  const container = document.getElementById('msu-map-container');
  if (!container || mapInstance) return;

  mapInstance = L.map('msu-map-container').setView(
    [mapStore.center.lat, mapStore.center.lng],
    mapStore.zoom,
  );
  routeLayer = L.layerGroup().addTo(mapInstance);
  mapInstance.on('click', (event) => {
    if (!isPickingStart.value) return;
    setStartLocation(event.latlng.lat, event.latlng.lng);
    isPickingStart.value = false;
  });

  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapInstance);

  tileLayer.on('tileload', scheduleTileCacheStatusRefresh);
  tileLayer.on('tileerror', () => {
    tileLoadErrors.value += 1;
  });

  // Add campus landmark anchors
  sampleAnchors.value.forEach((anchor) => {
    const marker = L.marker([anchor.coords[0], anchor.coords[1]]).addTo(mapInstance);
    marker.bindPopup(`<b>${anchor.name}</b><br><span style="font-size: 11px; color: #666;">${anchor.category}</span>`);
  });

  mapInstance.on('zoomend', () => {
    mapStore.setZoom(mapInstance.getZoom());
  });

  mapInstance.on('moveend', () => {
    const center = mapInstance.getCenter();
    mapStore.setCenter({ lat: center.lat, lng: center.lng });
  });
};

const focusAnchor = (anchor: { coords: number[] }) => {
  if (mapInstance) {
    mapInstance.flyTo([anchor.coords[0], anchor.coords[1]], 18, { duration: 1.2 });
  }
};

onMounted(() => {
  void loadLocations();
  isOnline.value = navigator.onLine;
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  navigator.serviceWorker?.addEventListener('controllerchange', refreshTileCacheStatus);
  refreshTileCacheStatus();
  initMap();
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateNetworkStatus);
  window.removeEventListener('offline', updateNetworkStatus);
  navigator.serviceWorker?.removeEventListener('controllerchange', refreshTileCacheStatus);
  if (cacheStatusTimer) clearTimeout(cacheStatusTimer);
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>
<style lang="css" scoped>
.my-input {
  border: 1px solid black;
  border-radius: 5px;
  width: 100%;
}
</style>
