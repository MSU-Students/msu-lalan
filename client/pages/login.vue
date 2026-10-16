<template>
  <main class="min-h-screen bg-white lg:grid lg:grid-cols-[1.04fr_0.96fr]">
  <!-- <section 
    class="relative hidden min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-10 xl:px-20"
    style="background-image: url('/bg-campus.jpg');"
  >       -->
    <section class="relative hidden min-h-screen overflow-hidden bg-slate-900 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-10 xl:px-20">
  <!-- Background Image na may Dark Overlay -->
  <div class="absolute inset-0 z-0">
    <img 
      src="~/assets/bg-campus.jpg" 
      alt="MSU Campus" 
      class="h-full w-full object-cover opacity-40" 
    />
    <div class="absolute inset-0 bg-gradient-to-t from-[#690b19]/90 via-[#690b19]/60 to-transparent"></div>
  </div>
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(255,215,0,0.14),transparent_38%),radial-gradient(ellipse_at_90%_85%,rgba(255,255,255,0.08),transparent_34%)]" aria-hidden="true"></div>
      <svg class="absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 800 1000" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-80 220C120 150 180 320 370 250S620 110 880 220M-90 300C120 230 200 400 390 330S640 190 900 300M-90 390C120 320 220 490 410 420S660 280 900 390M-100 490C120 420 240 590 430 520S680 380 920 490M-100 600C120 530 260 700 450 630S700 490 920 600M-100 720C120 650 280 820 470 750S720 610 920 720" stroke="white" stroke-width="2"/>
        <path d="M140-40C220 130 90 240 180 400S300 650 230 1040M250-40C330 130 200 240 290 400S410 650 340 1040M590-40C510 130 650 240 550 400S430 650 500 1040" stroke="white" stroke-width="2"/>
      </svg>


  ...
    <NuxtLink to="/" class="relative z-10 inline-flex w-fit items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd700]">
      <!-- White Badge Container -->
      <span class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-md">
        <img src="~/assets/logo.png" alt="MSU Lalan Logo" class="h-full w-full object-contain" />
      </span>

      <!-- Text Section -->
      <span>
        <span class="block text-lg font-bold tracking-tight">MSU Lalan</span>
        <span class="block text-xs font-medium text-white/65">Find your way around campus</span>
      </span>
    </NuxtLink>

      <div class="relative z-10 max-w-xl pb-5">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white/80">
          <MapPin :size="14" class="text-[#ffd700]" aria-hidden="true" />
          Mindanao State University · Marawi City
        </div>
        <h1 class="max-w-lg text-5xl font-semibold leading-[1.12] tracking-tight xl:text-[3.6rem]">
          Your campus,<br />
          <span class="text-[#ffd700]">within reach.</span>
        </h1>
        <p class="mt-5 max-w-md text-base leading-7 text-white/70">
          Sign in to make your way through MSU Lanao del Sur with confidence.
          Your campus directory and map are waiting.
        </p>

        <div class="mt-10 flex items-center gap-3 border-t border-white/15 pt-6">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#ffd700]">
            <ShieldCheck :size="20" aria-hidden="true" />
          </span>
          <div>
            <p class="text-sm font-semibold">A secure campus account</p>
            <p class="mt-0.5 text-xs text-white/55">Your sign-in is protected and private.</p>
          </div>
        </div>
      </div>

      <p class="relative z-10 text-xs text-white/45">
        © 2026 Mindanao State University Main Campus
      </p>
    </section>

    <section class="flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-20">
      <header class="flex items-center justify-between lg:justify-end">
        <NuxtLink to="/" class="inline-flex items-center gap-2 rounded-md text-sm font-bold text-[#800000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#800000] lg:hidden">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#800000] text-[#ffd700]">
            <Compass :size="20" aria-hidden="true" />
          </span>
          MSU Lalan
        </NuxtLink>
        <NuxtLink to="/" class="rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-[#800000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#800000]">
          Back to campus map
        </NuxtLink>
      </header>

      <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div class="mb-8">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#800000]">Welcome back</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.1rem]">
            Sign in to your account
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            Use your university email and password to continue.
          </p>
        </div>

        <form class="space-y-5" novalidate @submit.prevent="submit">
          <div>
            <label for="username" class="mb-2 block text-sm font-semibold text-slate-700">
              University email
            </label>
            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              inputmode="email"
              autocomplete="username"
              placeholder="name@msumain.edu.ph"
              :aria-invalid="Boolean(fieldErrors.username)"
              :aria-describedby="fieldErrors.username ? 'username-error' : undefined"
              class="block w-full rounded-xl border bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4"
              :class="fieldErrors.username ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#800000] focus:ring-[#800000]/10'"
              @input="fieldErrors.username = ''"
            />
            <p v-if="fieldErrors.username" id="username-error" class="mt-2 text-xs font-medium text-red-700">
              {{ fieldErrors.username }}
            </p>
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between">
              <label for="password" class="block text-sm font-semibold text-slate-700">
                Password
              </label>
            </div>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                :aria-invalid="Boolean(fieldErrors.password)"
                :aria-describedby="fieldErrors.password ? 'password-error' : undefined"
                class="block w-full rounded-xl border bg-white px-4 py-3.5 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4"
                :class="fieldErrors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#800000] focus:ring-[#800000]/10'"
                @input="fieldErrors.password = ''"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#800000]"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="18" aria-hidden="true" />
                <Eye v-else :size="18" aria-hidden="true" />
              </button>
            </div>
            <p v-if="fieldErrors.password" id="password-error" class="mt-2 text-xs font-medium text-red-700">
              {{ fieldErrors.password }}
            </p>
          </div>

          <p
            v-if="formError"
            class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
            role="alert"
            aria-live="polite"
          >
            {{ formError }}
          </p>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#800000] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#690000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800000] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span
              v-if="isSubmitting"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
              aria-hidden="true"
            ></span>
            {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
            <ArrowRight v-if="!isSubmitting" :size="17" aria-hidden="true" />
          </button>
        </form>

        <div class="my-7 flex items-center gap-4">
          <span class="h-px flex-1 bg-slate-200"></span>
          <span class="text-xs font-medium text-slate-400">or continue with</span>
          <span class="h-px flex-1 bg-slate-200"></span>
        </div>

        <a
          :href="`${apiBaseUrl}/auth/google`"
          class="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800000]"
        >
          <svg viewBox="0 0 48 48" class="h-[18px] w-[18px]" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6c4.51-4.18 7.07-10.32 7.07-17.65Z" transform="translate(0 0)"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1-.75-4.59c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" transform="translate(0 0)"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 0)"/>
          </svg>
          Continue with Google
        </a>

        <p class="mt-6 text-center text-xs leading-5 text-slate-500">
          Sign in with your MSU account to access campus services.
        </p>
      </div>

      <footer class="mx-auto w-full max-w-md border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
        © 2026 MSU Lalan <span class="mx-1.5">·</span> Campus Navigation &amp; Directory
      </footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Compass, Eye, EyeOff, MapPin, ShieldCheck } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

definePageMeta({ layout: false });

const authStore = useAuthStore();
const router = useRouter();
const config = useRuntimeConfig();
const apiBaseUrl = config.public.apiBaseUrl;

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);
const formError = ref('');
const fieldErrors = reactive({ username: '', password: '' });

function validateForm(): boolean {
  fieldErrors.username = '';
  fieldErrors.password = '';
  formError.value = '';

  const normalizedUsername = username.value.trim();
  if (!normalizedUsername) {
    fieldErrors.username = 'Enter your university email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedUsername)) {
    fieldErrors.username = 'Enter a valid email address.';
  }

  if (!password.value) {
    fieldErrors.password = 'Enter your password.';
  }

  return !fieldErrors.username && !fieldErrors.password;
}

async function submit() {
  if (isSubmitting.value || !validateForm()) return;

  isSubmitting.value = true;
  try {
    await authStore.login(username.value.trim(), password.value, apiBaseUrl);
    await router.replace('/');
  } catch (error: unknown) {
    formError.value = error instanceof Error
      ? error.message
      : 'Unable to sign in right now. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
