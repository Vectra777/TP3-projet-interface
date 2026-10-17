<script setup lang="ts">
import { ref } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'

const store = useStore()
const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (mode.value === 'register' && password.value.length < 4)
    return (error.value = 'The password must be at least 4 characters long.')
  busy.value = true
  try {
    await store.dispatch(mode.value, { name: name.value, password: password.value })
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' ? redirect : '/')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto mt-12 max-w-sm rounded-2xl border border-white/15 p-6">
    <h1 class="text-2xl font-bold">{{ mode === 'login' ? 'Sign in' : 'Create an account' }}</h1>
    <p class="mt-1 text-sm text-gray-400">Each account has its own library and favorites.</p>

    <form class="mt-6 flex flex-col gap-3" @submit.prevent="submit">
      <label class="flex flex-col gap-1 text-sm">
        Username
        <input
          v-model="name"
          required
          autocomplete="username"
          class="rounded-lg border border-white/20 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Password
        <input
          v-model="password"
          type="password"
          required
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          class="rounded-lg border border-white/20 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
      </label>

      <p v-if="error" class="rounded-lg bg-red-500/15 p-3 text-sm text-red-300" role="alert">{{ error }}</p>

      <button
        :disabled="busy"
        class="mt-2 rounded-lg bg-green-500 px-4 py-2 font-semibold text-gray-900 hover:bg-green-400 disabled:opacity-50"
      >
        {{ mode === 'login' ? 'Sign in' : 'Create account' }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-400">
      {{ mode === 'login' ? 'No account yet?' : 'Already have an account?' }}
      <button
        class="font-semibold text-green-400 hover:text-green-300"
        @click="(mode = mode === 'login' ? 'register' : 'login'), (error = '')"
      >
        {{ mode === 'login' ? 'Create one' : 'Sign in' }}
      </button>
    </p>
  </div>
</template>
