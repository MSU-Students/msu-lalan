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
                @click="logout"
                class="text-xs text-red-200 hover:text-white underline ml-2 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </template>
          <template v-else>
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center px-3.5 py-1.5 bg-msu-gold text-xs font-semibold rounded-md text-msu-maroon hover:bg-msu-gold-light transition-colors"
            >
              Register
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="inline-flex items-center px-3.5 py-1.5 border border-msu-gold text-xs font-semibold rounded-md text-msu-gold hover:bg-msu-gold hover:text-msu-maroon transition-colors"
            >
              Sign in
            </NuxtLink>
          </template>
        </div>
      </div>
      <nav
        v-if="authStore.isSuperAdmin || (authStore.isAuthenticated && !authStore.isCampusAdmin)"
        :aria-label="authStore.isSuperAdmin ? 'Super Admin navigation' : 'Account access requests'"
        class="border-t border-white/10 bg-msu-maroon-dark"
      >
        <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <NuxtLink
            v-if="authStore.isSuperAdmin"
            to="/admin/campus-admins"
            class="inline-flex items-center border-b-2 border-msu-gold px-3 py-3 text-xs font-bold tracking-wide text-msu-gold transition-colors hover:bg-white/5 hover:text-white"
          >
            Admin access
          </NuxtLink>
          <template v-else>
            <button
              type="button"
              :disabled="requestStatus === 'loading' || requestStatus === 'pending' || requestStatus === 'promoted'"
              class="inline-flex items-center gap-2 border-b-2 border-msu-gold px-3 py-3 text-xs font-bold tracking-wide text-msu-gold transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              @click="submitCampusAdminRequest"
            >
              {{ requestStatus === 'pending'
                ? 'Campus Admin request pending'
                : requestStatus === 'promoted'
                  ? 'Campus Admin access granted'
                  : requestStatus === 'loading'
                    ? 'Checking request…'
                    : 'Request Campus Admin access' }}
            </button>
            <span
              v-if="requestError"
              class="py-2 text-xs text-red-200"
              role="alert"
            >
              {{ requestError }}
            </span>
          </template>
        </div>
      </nav>
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
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

type RequestStatus = 'loading' | 'none' | 'pending' | 'promoted';

const authStore = useAuthStore();
const router = useRouter();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl;
const requestStatus = ref<RequestStatus>('loading');
const requestError = ref('');

watch(
  () => [authStore.user?.id, authStore.user?.role, authStore.token] as const,
  ([userId]) => {
    requestError.value = '';
    if (!userId || authStore.isCampusAdmin) {
      requestStatus.value = 'none';
      return;
    }

    void loadCampusAdminRequest();
  },
  { immediate: true },
);

async function loadCampusAdminRequest() {
  requestStatus.value = 'loading';
  try {
    const response = await fetch(`${apiBaseUrl}/admin/campus-admin-requests/me`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload.message === 'string' ? payload.message : 'Unable to check request status.');
    }
    requestStatus.value = payload.data?.status === 'PROMOTED'
      ? 'promoted'
      : payload.data?.status === 'PENDING'
        ? 'pending'
        : 'none';
    if (requestStatus.value === 'promoted') {
      await authStore.initFromStorage(apiBaseUrl);
    }
  } catch (error: unknown) {
    requestStatus.value = 'none';
    requestError.value = error instanceof Error ? error.message : 'Unable to check request status.';
  }
}

async function submitCampusAdminRequest() {
  if (!authStore.token || requestStatus.value === 'loading' || requestStatus.value === 'pending') return;
  requestStatus.value = 'loading';
  requestError.value = '';
  try {
    const response = await fetch(`${apiBaseUrl}/admin/campus-admin-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload.message === 'string' ? payload.message : 'Unable to submit your request.');
    }
    requestStatus.value = payload.data?.status === 'PROMOTED' ? 'promoted' : 'pending';
    if (requestStatus.value === 'promoted') {
      await authStore.initFromStorage(apiBaseUrl);
    }
  } catch (error: unknown) {
    requestStatus.value = 'none';
    requestError.value = error instanceof Error ? error.message : 'Unable to submit your request.';
  }
}

async function logout() {
  await authStore.logout(apiBaseUrl);
  await router.replace('/');
}
</script>
