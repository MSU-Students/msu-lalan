import { defineStore } from 'pinia';
import type { MapCoordinates } from '../types';

export interface MapState {
  center: MapCoordinates;
  zoom: number;
  userLocation: MapCoordinates | null;
  isGpsTracking: boolean;
  selectedEstablishmentId: string | null;
}

export const useMapStore = defineStore('map', {
  state: (): MapState => ({
    // Default MSU Main Campus coordinates (Marawi City)
    center: {
      lat: 8.0035,
      lng: 124.2621,
    },
    zoom: 16,
    userLocation: null,
    isGpsTracking: false,
    selectedEstablishmentId: null,
  }),

  actions: {
    setCenter(coords: MapCoordinates) {
      this.center = coords;
    },

    setZoom(zoom: number) {
      this.zoom = zoom;
    },

    setUserLocation(coords: MapCoordinates) {
      this.userLocation = coords;
    },

    toggleGpsTracking() {
      this.isGpsTracking = !this.isGpsTracking;
    },

    selectEstablishment(id: string | null) {
      this.selectedEstablishmentId = id;
    },

    resetToCampusCenter() {
      this.center = { lat: 8.0035, lng: 124.2621 };
      this.zoom = 16;
    },
  },
});
