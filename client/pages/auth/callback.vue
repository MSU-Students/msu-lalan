<template>
  <div class="flex-1 flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-xl shadow-md border border-slate-200 max-w-md w-full text-center">
      <div v-if="loading" class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-msu-maroon border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 class="text-lg font-bold text-slate-800">Authenticating...</h2>
        <p class="text-xs text-slate-500 mt-1">Verifying Google OAuth session credentials...</p>
      </div>

      <div v-else-if="error" class="flex flex-col items-center">
        <div class="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-xl mb-4">
          !
        </div>
        <h2 class="text-lg font-bold text-red-700">Authentication Failed</h2>
        <p class="text-xs text-slate-600 mt-2">{{ error }}</p>
        <NuxtLink
          to="/"
          class="mt-4 inline-block px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
        >
          Return to Map
        </NuxtLink>
      </div>

      <div v-else class="flex flex-col items-center">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xl mb-4">
          ✓
        </div>
        <h2 class="text-lg font-bold text-slate-800">Welcome to MSU Lalan</h2>
        <p class="text-xs text-slate-500 mt-1">Successfully signed in with Google</p>
        <p class="text-xs font-semibold text-msu-maroon mt-2">Redirecting to campus map...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    error.value = 'No access token received from authentication server.';
    loading.value = false;
    return;
  }

  try {
    authStore.setToken(token);

    // Fetch user profile from API /auth/me
    const response = await fetch(`${config.public.apiBaseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve user profile.');
    }

    const json = await response.json();
    authStore.setUser(json.data);
    loading.value = false;

    // Redirect to home after 1 second
    setTimeout(() => {
      router.push('/');
    }, 1000);
  } catch (err: any) {
    error.value = err.message || 'Authentication error occurred.';
    loading.value = false;
  }
});
</script>
