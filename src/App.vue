<script setup lang="ts">
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

const store = useStore()
const router = useRouter()

async function logout() {
  await store.dispatch('logout')
  router.push('/login')
}
</script>

<template>
  <nav class="flex items-center gap-4 border-b border-white/10 p-4">
    <template v-if="store.state.user">
      <RouterLink to="/">Search</RouterLink>
      <RouterLink to="/library">Library</RouterLink>
      <RouterLink to="/favorites">Favorites</RouterLink>
      <span class="ml-auto text-sm text-gray-400">{{ store.state.user }}</span>
      <button class="text-sm font-semibold text-gray-300 hover:text-white" @click="logout">Log out</button>
    </template>
    <span v-else class="font-bold">Movie Library</span>
  </nav>
  <main class="mx-auto max-w-5xl p-4"><RouterView /></main>
</template>
