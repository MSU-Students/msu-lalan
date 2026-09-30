<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header Navigation -->
    <header class="bg-msu-maroon text-white shadow-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-msu-gold text-msu-maroon font-bold flex items-center justify-center text-xl shadow">
            M
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight leading-tight">MSU Lalan</h1>
            <p class="text-xs text-msu-gold font-medium">Campus Navigation & Directory</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-800 text-emerald-100 border border-emerald-600">
            Welcome to MSU Lalan
          </span>

          <template v-if="authStore.isAuthenticated">
            <div class="flex items-center space-x-2 bg-msu-maroon-dark px-3 py-1.5 rounded-lg border border-red-900/50">
              <span class="text-xs text-white font-medium">{{ authStore.displayName }}</span>
              <span class="text-[10px] uppercase tracking-wider bg-msu-gold text-slate-900 px-1.5 py-0.5 rounded font-bold">
                {{ authStore.user?.role || 'USER' }}
              </span>
              <button
                @click="authStore.logout()"
                class="text-xs text-red-200 hover:text-white underline ml-2 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </template>
          <template v-else>
            <a
              :href="`${apiBaseUrl}/auth/google`"
              class="inline-flex items-center px-3.5 py-1.5 border border-msu-gold text-xs font-semibold rounded-md text-msu-gold hover:bg-msu-gold hover:text-msu-maroon transition-colors"
            >
              Sign in with Google
            </a>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-slate-900 text-slate-400 py-4 px-4 text-center text-xs border-t border-slate-800">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>&copy; 2026 Mindanao State University Main Campus, Marawi City. All rights reserved.</p>
        <p class="text-slate-500">MSU Lalan PWA &bullet; Offline-Resilient Geospatial Compass</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl;
</script>
