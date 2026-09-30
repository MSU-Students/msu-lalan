import L from 'leaflet';

export default defineNuxtPlugin(() => {
  return {
    provide: {
      leaflet: L,
    },
  };
});
