<template>
  <div class="flex-1 flex items-center justify-center p-4 sm:p-6">
    <div class="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 max-w-md w-full">
      <!-- Success confirmation -->
      <div v-if="registered" class="flex flex-col items-center text-center" role="status">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xl mb-4">
          ✓
        </div>
        <h2 class="text-lg font-bold text-slate-800">Registration successful</h2>
        <p class="text-sm text-slate-600 mt-2">{{ successMessage }}</p>
        <p class="text-xs text-slate-500 mt-1">Your account was created with guest access.</p>
        <div class="mt-5 flex flex-col sm:flex-row gap-2 w-full">
          <NuxtLink
            to="/login"
            class="flex-1 inline-flex justify-center px-4 py-2 bg-msu-maroon text-white text-sm font-semibold rounded-lg hover:bg-msu-maroon-dark transition-colors"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/"
            class="flex-1 inline-flex justify-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Back to Map
          </NuxtLink>
        </div>
      </div>

      <!-- Registration form -->
      <template v-else>
        <h2 class="text-xl font-bold text-slate-800">Create a guest account</h2>
        <p class="text-xs text-slate-500 mt-1 mb-5">
          Register to use MSU Lalan as a guest. Already have an account?
          <NuxtLink to="/login" class="text-msu-maroon font-semibold hover:underline">Sign in</NuxtLink>
        </p>

        <div
          v-if="submitError"
          class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          role="alert"
        >
          {{ submitError }}
        </div>

        <form class="space-y-4" novalidate @submit.prevent="onSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="firstName" class="block text-xs font-semibold text-slate-700 mb-1">First name</label>
              <input
                id="firstName"
                v-model="form.firstName"
                type="text"
                autocomplete="given-name"
                maxlength="100"
                :aria-invalid="!!errors.firstName"
                :aria-describedby="errors.firstName ? 'firstName-error' : undefined"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-msu-maroon"
                :class="errors.firstName ? 'border-red-400' : 'border-slate-300'"
              />
              <p v-if="errors.firstName" id="firstName-error" class="mt-1 text-[11px] text-red-600">{{ errors.firstName }}</p>
            </div>
            <div>
              <label for="lastName" class="block text-xs font-semibold text-slate-700 mb-1">Last name</label>
              <input
                id="lastName"
                v-model="form.lastName"
                type="text"
                autocomplete="family-name"
                maxlength="100"
                :aria-invalid="!!errors.lastName"
                :aria-describedby="errors.lastName ? 'lastName-error' : undefined"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-msu-maroon"
                :class="errors.lastName ? 'border-red-400' : 'border-slate-300'"
              />
              <p v-if="errors.lastName" id="lastName-error" class="mt-1 text-[11px] text-red-600">{{ errors.lastName }}</p>
            </div>
          </div>

          <div>
            <label for="email" class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              maxlength="255"
              :aria-invalid="!!errors.email"
              :aria-describedby="errors.email ? 'email-error' : undefined"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-msu-maroon"
              :class="errors.email ? 'border-red-400' : 'border-slate-300'"
            />
            <p v-if="errors.email" id="email-error" class="mt-1 text-[11px] text-red-600">{{ errors.email }}</p>
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :aria-invalid="!!errors.password"
                :aria-describedby="errors.password ? 'password-error' : 'password-hint'"
                class="w-full rounded-lg border px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-msu-maroon"
                :class="errors.password ? 'border-red-400' : 'border-slate-300'"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p v-if="errors.password" id="password-error" class="mt-1 text-[11px] text-red-600">{{ errors.password }}</p>
            <p v-else id="password-hint" class="mt-1 text-[11px] text-slate-500">
              At least 8 characters, with a letter and a number.
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-xs font-semibold text-slate-700 mb-1">Confirm password</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :aria-invalid="!!errors.confirmPassword"
              :aria-describedby="errors.confirmPassword ? 'confirmPassword-error' : undefined"
              class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-msu-maroon"
              :class="errors.confirmPassword ? 'border-red-400' : 'border-slate-300'"
            />
            <p v-if="errors.confirmPassword" id="confirmPassword-error" class="mt-1 text-[11px] text-red-600">
              {{ errors.confirmPassword }}
            </p>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-msu-maroon text-white text-sm font-semibold rounded-lg hover:bg-msu-maroon-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <span
              v-if="loading"
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            ></span>
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import {
  validateRegistration,
  type RegistrationErrors,
  type RegistrationForm,
} from '../../utils/registration';

const authStore = useAuthStore();
const config = useRuntimeConfig();

const form = reactive<RegistrationForm>({
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
});
const errors = ref<RegistrationErrors>({});
const submitError = ref<string | null>(null);
const successMessage = ref('');
const loading = ref(false);
const registered = ref(false);
const showPassword = ref(false);

async function onSubmit() {
  if (loading.value) return;

  submitError.value = null;
  errors.value = validateRegistration(form);
  if (Object.keys(errors.value).length > 0) return;

  loading.value = true;
  try {
    const result = await authStore.register(config.public.apiBaseUrl, {
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
    });

    if (result.success) {
      successMessage.value = result.message;
      registered.value = true;
      form.password = '';
      form.confirmPassword = '';
    } else {
      submitError.value = result.message;
    }
  } finally {
    loading.value = false;
  }
}
</script>
