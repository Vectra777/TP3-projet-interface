<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { posterUrl } from '@/api/tmdb'
import type { Item } from '@/store'

const store = useStore()
const favorites = computed<Item[]>(() => store.getters.favorites)
</script>

<template>
  <h1 class="text-2xl font-bold">Favorites</h1>

  <p v-if="!favorites.length" class="mt-6 rounded-xl border border-dashed p-8 text-center text-gray-400">
    No favorites yet. Open a movie from your library and click “♡ Favorite”.
  </p>

  <div v-else class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
    <div v-for="item in favorites" :key="item.id" class="flex flex-col">
      <RouterLink :to="`/movie/${item.id}`" class="transition hover:scale-105">
        <img v-if="item.poster" :src="posterUrl(item.poster)" :alt="item.title" class="w-full rounded-lg">
        <div v-else class="flex aspect-2/3 items-center rounded-lg bg-gray-700 p-2 text-xs font-bold">
          {{ item.title }}
        </div>
        <p class="mt-2 text-sm font-semibold">{{ item.title }}</p>
      </RouterLink>
      <p class="text-xs text-gray-400">
        {{ item.year || '-' }}<template v-if="item.director"> · {{ item.director }}</template>
      </p>
      <p class="text-xs text-gray-400">
        {{ item.watched ? '✓ Watched' : 'Not watched yet' }}
        <span v-if="item.rating" class="text-yellow-400"> · ★ {{ item.rating }}/5</span>
      </p>
      <button
        class="mt-auto pt-2 text-left text-sm font-semibold text-pink-400 hover:text-pink-300"
        @click="store.dispatch('toggleFavorite', item.id)"
      >
        ♥ Remove from favorites
      </button>
    </div>
  </div>
</template>
