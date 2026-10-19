<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { searchMovies, getDirector, getTrending, posterUrl, type MovieResult } from '@/api/tmdb'

const store = useStore()

const search = ref('')
const query = ref('') // last submitted search, so "Load more" ignores what is being typed
const results = ref<MovieResult[]>([])
const page = ref(1)
const totalPages = ref(0)
const loading = ref(false)
const error = ref('')
const directors = reactive<Record<number, string>>({})

const trending = ref<MovieResult[]>([])
// trending movies until the user searches something, and again once the search is cleared
const shown = computed(() => (query.value ? results.value : trending.value))

const noResults = computed(() => query.value && !loading.value && !error.value && !results.value.length)

// fill in directors in the background, cards show up right away
function fetchDirectors(movies: MovieResult[]) {
  for (const m of movies)
    if (!(m.id in directors)) getDirector(m.id).then((d) => (directors[m.id] = d), () => {})
}

onMounted(async () => {
  loading.value = true
  try {
    trending.value = await getTrending()
    fetchDirectors(trending.value)
  } catch {
    error.value = 'Could not load trending movies. Check your connection or your TMDB key in .env.'
  } finally {
    loading.value = false
  }
})

async function load(p: number) {
  loading.value = true
  error.value = ''
  try {
    const data = await searchMovies(query.value, p)
    // TMDB sometimes repeats a movie across pages
    const fresh = data.results.filter((m) => !results.value.some((r) => r.id === m.id))
    results.value = p === 1 ? data.results : [...results.value, ...fresh]
    page.value = p
    totalPages.value = data.totalPages
    fetchDirectors(data.results)
  } catch {
    error.value = 'The search failed. Check your connection or your TMDB key in .env.'
  } finally {
    loading.value = false
  }
}

function submit() {
  query.value = search.value.trim()
  results.value = []
  error.value = ''
  if (query.value) load(1)
}

async function add(m: MovieResult) {
  const director = directors[m.id] ?? (await getDirector(m.id).catch(() => ''))
  store.dispatch('addItem', {
    id: String(m.id),
    title: m.title,
    year: m.release_date?.slice(0, 4) ?? '',
    poster: m.poster_path ?? '',
    director,
  })
}
</script>

<template>
  <h1 class="text-2xl font-bold">Search</h1>

  <form class="px-8 my-4 flex gap-2" @submit.prevent="submit">
    <input
      v-model="search"
      type="search"
      placeholder="Search a movie, e.g. Interstellar"
      aria-label="Search"
      class="w-full rounded-lg border border-white/20 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
    >
    <button
      class="rounded-lg bg-green-500 px-4 py-2 font-semibold text-gray-900 hover:bg-green-400 disabled:opacity-50"
      :disabled="loading"
    >
      Search
    </button>
  </form>

  <p v-if="error" class="mx-8 rounded-lg bg-red-500/15 p-4 text-red-300" role="alert">{{ error }}</p>
  <p v-if="noResults" class="mx-8 rounded-xl border border-dashed p-8 text-center text-gray-400">
    No results found for “{{ query }}”.
  </p>

  <h2 v-if="!query && trending.length" class="mx-8 mt-8 mb-4 text-xl font-bold">🔥 Trending this week</h2>

  <div class="px-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
    <div v-for="movie in shown" :key="movie.id" class="flex flex-col">
      <RouterLink :to="`/movie/${movie.id}`" class="transition hover:scale-105">
        <img
          v-if="movie.poster_path"
          :src="posterUrl(movie.poster_path)"
          :alt="movie.title"
          class="w-full rounded-lg"
        >
        <div v-else class="flex aspect-2/3 items-center rounded-lg bg-gray-700 p-2 text-xs font-bold">
          {{ movie.title }}
        </div>
        <p class="mt-2 text-sm font-semibold">{{ movie.title }}</p>
      </RouterLink>
      <p class="text-xs text-gray-400">
        {{ movie.release_date?.slice(0, 4) || '-' }}<template v-if="directors[movie.id]"> · {{ directors[movie.id] }}</template>
      </p>
      <button
        v-if="!store.getters.has(String(movie.id))"
        class="mt-auto pt-2 text-left text-sm font-semibold text-green-400 hover:text-green-300"
        @click="add(movie)"
      >
        + Add to library
      </button>
      <span v-else class="mt-auto pt-2 text-sm text-gray-500">✓ In your library</span>
    </div>
  </div>

  <p v-if="loading" class="p-8 text-center text-gray-400" aria-live="polite">
    <span class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent align-middle" />
    Loading…
  </p>
  <div v-else-if="query && page < totalPages" class="p-8 text-center">
    <button class="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" @click="load(page + 1)">
      Load more
    </button>
  </div>
</template>
