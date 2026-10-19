<template>
  <div class="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
    <!-- Left Panel: Directory & Sprint 0 Controls -->
    <div class="w-full md:w-1/3 flex flex-col gap-4">
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

        <!-- Map Leaflet DOM Target Container -->
        <ClientOnly>
          <LeafletMap
            ref="mapComponent"
            :center="mapStore.center"
            :zoom="mapStore.zoom"
            :markers="sampleAnchors"
            @center-change="mapStore.setCenter"
            @zoom-change="mapStore.setZoom"
          />
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
import { ref } from 'vue';
import { useMapStore } from '../stores/map';
import { usePilarStore } from '~/stores/pilar';
import LeafletMap from '~/components/LeafletMap.vue';
import type { CampusMapMarker } from '~/types';

const mapStore = useMapStore();
const pilarStore = usePilarStore();
const mapComponent = ref<{ focusAnchor: (anchor: CampusMapMarker) => void } | null>(null);

const pageTitle = 'MSU Marawi Campus'; 
const campusAddress = 'Marawi City, Lanao del Sur 8.0035° N, 124.2621° E';

const newPilar = ref('Sample');
function onEnterPilar() {
  pilarStore.addNewPilar(newPilar.value);
}
const sampleAnchors = ref<CampusMapMarker[]>([
  { id: '1', name: 'MSU Commercial Center (Agora)', category: 'Commercial', coords: [8.0035, 124.2621] },
  { id: '2', name: 'College of Information & Computing Sciences (CICS)', category: 'Academic', coords: [8.0042, 124.2635] },
  { id: '3', name: 'MSU Senate / Administration Building', category: 'Administrative', coords: [8.0051, 124.2612] },
  { id: '4', name: 'Dimaporo Gymnasium', category: 'Sports', coords: [8.0028, 124.2605] },
  { id: '5', name: 'MSU Peace Park', category: 'Landmark', coords: [8.0062, 124.2589] },
]);

const focusAnchor = (anchor: CampusMapMarker) => {
  mapComponent.value?.focusAnchor(anchor);
};

</script>
<style lang="css" scoped>
.my-input {
  border: 1px solid black;
  border-radius: 5px;
  width: 100%;
}
</style>
