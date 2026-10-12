<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();

onMounted(() => {
  void authStore.initFromStorage(config.public.apiBaseUrl);
});
</script>
