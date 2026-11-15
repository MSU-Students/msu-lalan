<template>
  <div class="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
    <NuxtLink
      to="/"
      class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-msu-maroon"
    >
      <ArrowLeft :size="16" aria-hidden="true" />
      Back to campus map
    </NuxtLink>

    <section class="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-msu-maroon via-msu-maroon-dark to-[#340000] p-6 text-white shadow-xl sm:p-9">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-2xl">
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-msu-gold/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-msu-gold">
            <ShieldCheck :size="15" aria-hidden="true" />
            Super Admin workspace
          </div>
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Campus Admin access</h1>
          <p class="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Review existing MSU employee accounts that signed in with a verified
            <span class="font-semibold text-msu-gold">@s.msumain.edu.ph</span>
            Google account before granting administrative access.
          </p>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
          <UsersRound :size="20" class="text-msu-gold" aria-hidden="true" />
          <div>
            <p class="text-2xl font-bold leading-none">{{ requests.length }}</p>
            <p class="mt-1 text-[11px] font-medium text-white/65">pending requests</p>
          </div>
        </div>
      </div>
    </section>

    <div class="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Campus Admin requests</h2>
        <p class="mt-1 text-sm text-slate-500">Requests are listed even when an account is not eligible; only verified MSU employees can be promoted.</p>
      </div>
      <button
        type="button"
        :disabled="loading"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-msu-maroon/30 hover:text-msu-maroon disabled:cursor-not-allowed disabled:opacity-60"
        @click="loadCandidates"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        Refresh list
      </button>
    </div>

    <p
      v-if="errorMessage"
      class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
      role="status"
      aria-live="polite"
    >
      {{ successMessage }}
    </p>

    <div
      v-if="!loading && (requests.length || candidates.length)"
      class="mt-5"
    >
      <label class="relative block">
        <Search :size="17" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <span class="sr-only">Search Campus Admin requests and accounts</span>
        <input
          v-model="search"
          type="search"
          placeholder="Search by name or email"
          class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-msu-maroon/50 focus:ring-4 focus:ring-msu-maroon/5"
        />
      </label>
    </div>

    <div class="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="flex flex-col items-center px-6 py-16 text-center">
        <span class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-msu-maroon/15 border-t-msu-maroon" aria-hidden="true"></span>
        <p class="font-semibold text-slate-800">Checking eligible accounts</p>
        <p class="mt-1 text-sm text-slate-500">Verifying the latest account and Google sign-in details.</p>
      </div>

      <div v-else-if="!filteredRequests.length" class="px-6 py-16 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-msu-maroon">
          <BadgeCheck :size="23" aria-hidden="true" />
        </div>
        <h3 class="mt-4 font-bold text-slate-900">
          {{ search ? 'No matching requests' : 'No requests yet' }}
        </h3>
        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {{ search
            ? 'Try another name or email address.'
            : 'When a user requests Campus Admin access, their account will appear here with its eligibility status.' }}
        </p>
      </div>

      <template v-else>
        <ul class="divide-y divide-slate-100">
          <li
            v-for="candidate in filteredRequests"
            :key="candidate.requestId"
            class="flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div class="flex min-w-0 items-center gap-3.5">
              <img
                v-if="candidate.avatarUrl"
                :src="candidate.avatarUrl"
                alt=""
                class="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
              />
              <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-msu-maroon">
                <UserRound :size="21" aria-hidden="true" />
              </div>
              <div class="min-w-0">
                <p class="truncate font-semibold text-slate-900">{{ fullName(candidate) }}</p>
                <p class="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
                  <Mail :size="14" class="shrink-0" aria-hidden="true" />
                  {{ candidate.email }}
                </p>
                <p v-if="candidate.departmentAffiliation" class="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-400">
                  <Building2 :size="13" class="shrink-0" aria-hidden="true" />
                  {{ candidate.departmentAffiliation }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-3 sm:pl-4">
              <span
                class="inline-flex max-w-sm items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                :class="candidate.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'"
                :title="candidate.eligibilityReason"
              >
                <CheckCircle2 v-if="candidate.eligible" :size="14" aria-hidden="true" />
                <ShieldCheck v-else :size="14" aria-hidden="true" />
                {{ candidate.eligible ? 'Eligible employee' : candidate.eligibilityReason }}
              </span>
              <button
                type="button"
                :disabled="!candidate.eligible || promotingId === candidate.id"
                :title="candidate.eligible ? 'Promote this employee' : candidate.eligibilityReason"
                class="rounded-xl bg-msu-maroon px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-msu-maroon-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-msu-maroon disabled:cursor-not-allowed disabled:opacity-40"
                @click="confirmCandidateId = candidate.id"
              >
                {{ candidate.eligible ? 'Promote' : 'Not eligible' }}
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>

    <section v-if="filteredCandidates.length" class="mt-8">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-slate-900">Other eligible accounts</h2>
        <p class="mt-1 text-sm text-slate-500">Verified MSU employees who have not submitted a request.</p>
      </div>
      <ul class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <li
          v-for="candidate in filteredCandidates"
          :key="candidate.id"
          class="flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-900">{{ fullName(candidate) }}</p>
            <p class="mt-1 truncate text-sm text-slate-500">{{ candidate.email }}</p>
          </div>
          <button
            type="button"
            :disabled="promotingId === candidate.id"
            class="rounded-xl bg-msu-maroon px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-msu-maroon-dark disabled:cursor-not-allowed disabled:opacity-60"
            @click="confirmCandidateId = candidate.id"
          >
            Promote
          </button>
        </li>
      </ul>
    </section>

    <div
      v-if="confirmedCandidate"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      @click.self="confirmCandidateId = null"
      @keydown.esc="confirmCandidateId = null"
    >
      <section
        class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
        aria-describedby="promotion-description"
      >
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-msu-maroon">
          <ShieldCheck :size="22" aria-hidden="true" />
        </div>
        <h2 id="promotion-title" class="mt-4 text-lg font-bold text-slate-900">Grant Campus Admin access?</h2>
        <p id="promotion-description" class="mt-2 text-sm leading-6 text-slate-600">
          <span class="font-semibold text-slate-800">{{ confirmedCandidate.email }}</span>
          will receive Campus Admin permissions. This action is recorded in the audit log.
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            :disabled="promotingId === confirmedCandidate.id"
            @click="confirmCandidateId = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-msu-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-msu-maroon-dark disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="promotingId === confirmedCandidate.id"
            @click="promoteCandidate(confirmedCandidate)"
          >
            <LoaderCircle v-if="promotingId === confirmedCandidate.id" :size="16" class="animate-spin" aria-hidden="true" />
            {{ promotingId === confirmedCandidate.id ? 'Promoting…' : 'Confirm promotion' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  LoaderCircle,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { UserRole } from '~/types';

interface CampusAdminCandidate {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  departmentAffiliation?: string;
  role: UserRole;
  createdAt: string;
}

interface CampusAdminRequestReview extends CampusAdminCandidate {
  requestId: string;
  requestedAt: string;
  eligible: boolean;
  eligibilityReason: string;
}

const authStore = useAuthStore();
const config = useRuntimeConfig();
const candidates = ref<CampusAdminCandidate[]>([]);
const requests = ref<CampusAdminRequestReview[]>([]);
const search = ref('');
const loading = ref(true);
const promotingId = ref<string | null>(null);
const confirmCandidateId = ref<string | null>(null);
const errorMessage = ref('');
const successMessage = ref('');

const filteredCandidates = computed(() => {
  const query = search.value.trim().toLowerCase();
  const requestedIds = new Set(requests.value.map((request) => request.id));
  return candidates.value.filter((candidate) => {
    if (requestedIds.has(candidate.id)) return false;
    return !query || `${candidate.firstName || ''} ${candidate.lastName || ''} ${candidate.email}`
      .toLowerCase()
      .includes(query);
  });
});

const filteredRequests = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return requests.value;
  return requests.value.filter((candidate) =>
    `${candidate.firstName || ''} ${candidate.lastName || ''} ${candidate.email}`
      .toLowerCase()
      .includes(query),
  );
});

const confirmedCandidate = computed(
  () =>
    requests.value.find((candidate) => candidate.id === confirmCandidateId.value) ||
    candidates.value.find((candidate) => candidate.id === confirmCandidateId.value) ||
    null,
);

function fullName(candidate: CampusAdminCandidate): string {
  const name = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  return name || candidate.email;
}

async function loadCandidates() {
  if (!authStore.isSuperAdmin) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const [candidateResponse, requestResponse] = await Promise.all([
      fetch(`${config.public.apiBaseUrl}/admin/campus-admin-candidates`, { headers }),
      fetch(`${config.public.apiBaseUrl}/admin/campus-admin-requests`, { headers }),
    ]);
    const [candidatePayload, requestPayload] = await Promise.all([
      candidateResponse.json(),
      requestResponse.json(),
    ]);
    if (
      !candidateResponse.ok ||
      !requestResponse.ok ||
      !Array.isArray(candidatePayload.data) ||
      !Array.isArray(requestPayload.data)
    ) {
      const message = candidatePayload.message || requestPayload.message;
      throw new Error(typeof message === 'string' ? message : 'Unable to load Campus Admin requests.');
    }
    candidates.value = candidatePayload.data;
    requests.value = requestPayload.data;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load eligible accounts.';
  } finally {
    loading.value = false;
  }
}

async function promoteCandidate(candidate: CampusAdminCandidate) {
  if (!authStore.isSuperAdmin || promotingId.value) return;
  promotingId.value = candidate.id;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const response = await fetch(
      `${config.public.apiBaseUrl}/admin/users/${encodeURIComponent(candidate.id)}/promote-campus-admin`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload.message === 'string' ? payload.message : 'Unable to promote this account.');
    }
    candidates.value = candidates.value.filter((account) => account.id !== candidate.id);
    requests.value = requests.value.filter((account) => account.id !== candidate.id);
    confirmCandidateId.value = null;
    successMessage.value = `${candidate.email} is now a Campus Admin.`;
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to promote this account.';
  } finally {
    promotingId.value = null;
  }
}

onMounted(async () => {
  await authStore.initFromStorage(config.public.apiBaseUrl);
  if (authStore.isSuperAdmin) {
    await loadCandidates();
  } else {
    loading.value = false;
    errorMessage.value = 'This workspace is available to Super Admins only.';
  }
});
</script>
