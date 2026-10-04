<script setup lang="ts">
import { ref } from 'vue'
import { searchMovies, posterUrl } from '@/api/tmdb'

const search = ref('')
const result = ref<Awaited<ReturnType<typeof searchMovies>>>([])

async function getMovies() {
  result.value = await searchMovies(search.value)
}
</script>

<template>
  <h1 class="text-2xl font-bold">Search</h1>

  <div class="px-8 my-4">
    <input
      v-model="search"
      type="search"
      placeholder="Search..."
      aria-label="Search"
      class="w-full rounded-lg border border-white/20 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      @change="getMovies"
    >
  </div>

  <div class="px-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
    <RouterLink
      v-for="movie in result"
      :key="movie.id"
      :to="`/movie/${movie.id}`"
      class="transition hover:scale-105"
    >
      <img
        v-if="movie.poster_path"
        :src="posterUrl(movie.poster_path)"
        :alt="movie.title"
        class="w-full rounded-lg"
      >
      <p class="mt-2 text-sm font-semibold">{{ movie.title }}</p>
    </RouterLink>
  </div>
</template>
