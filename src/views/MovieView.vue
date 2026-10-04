<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import type { Item } from '@/store'
import { getMovie, getRecommendations, posterUrl } from '@/api/tmdb'

const route = useRoute()
const movie = ref<Awaited<ReturnType<typeof getMovie>>>(null)
const recommendations = ref<Awaited<ReturnType<typeof getRecommendations>>>([])

// watch, not onMounted: clicking a recommendation reuses this component with a new :id
watch(
  () => route.params.id,
  async (id) => {
    if (typeof id !== 'string') return
    movie.value = null
    ;[movie.value, recommendations.value] = await Promise.all([getMovie(id), getRecommendations(id)])
    window.scrollTo(0, 0)
  },
  { immediate: true },
)

const store = useStore()
const saved = computed(() => (store.state.items as Item[]).find((i) => i.id === String(route.params.id)))

function addToLibrary() {
  const m = movie.value
  store.dispatch('addItem', { id: String(m.id), title: m.title, year: m.release_date?.slice(0, 4) ?? '', poster: m.poster_path ?? '' })
}
// the review is lost with it, so ask first
function removeFromLibrary() {
  if (confirm(`Remove "${saved.value!.title}" from your library? Your review will be deleted.`))
    store.commit('remove', saved.value!.id)
}
const setReview =(patch: Partial<Pick<Item, 'rating' | 'review'>>) => store.commit('setReview', { id: saved.value!.id, ...patch })

const backdropUrl = (path: string) => `https://image.tmdb.org/t/p/w1280${path}`
const director = (m: typeof movie.value) => m.credits.crew.find((p: { job: string }) => p.job === 'Director')?.name
const hours = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
</script>

<template>
  <p v-if="!movie" class="p-8 text-center text-gray-400">Loading...</p>

  <article v-else>
    <!-- hero: blurred backdrop with poster + key info on top -->
    <section class="relative overflow-hidden rounded-2xl bg-gray-900 text-white">
      <img
        v-if="movie.backdrop_path"
        :src="backdropUrl(movie.backdrop_path)"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-40"
      >
      <div class="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/60 to-transparent" />

      <div class="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
        <img
          v-if="movie.poster_path"
          :src="posterUrl(movie.poster_path)"
          :alt="movie.title"
          class="w-40 shrink-0 rounded-xl shadow-2xl sm:w-56"
        >

        <div class="flex flex-col gap-3">
          <h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl">{{ movie.title }}</h1>
          <p v-if="movie.tagline" class="italic text-gray-300">{{ movie.tagline }}</p>

          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span class="rounded-full bg-green-500 px-3 py-1 font-bold text-gray-900">
              ★ {{ movie.vote_average.toFixed(1) }}
            </span>
            <span>{{ movie.release_date?.slice(0, 4) }}</span>
            <span v-if="movie.runtime">· {{ hours(movie.runtime) }}</span>
            <span v-if="director(movie)">· {{ director(movie) }}</span>
          </div>

          <div class="flex flex-wrap gap-2">
            <span
              v-for="genre in movie.genres"
              :key="genre.id"
              class="rounded-full border border-white/30 px-3 py-1 text-xs"
            >
              {{ genre.name }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-2 text-xl font-bold">Synopsis</h2>
      <p class="leading-relaxed text-gray-300">{{ movie.overview || 'No synopsis available.' }}</p>
    </section>

    <section class="mt-8 rounded-2xl border border-white/15 p-6">
      <button
        v-if="!saved"
        class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-semibold text-gray-900 hover:bg-green-400"
        @click="addToLibrary"
      >
        <!-- books on a shelf with a plus -->
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 4v16M8 4v16M12 6l3 14M3 20h11" />
          <path d="M19 3v6M16 6h6" />
        </svg>
        Add to library
      </button>

      <template v-else>
        <div class="inline-flex rounded-lg border border-white/20 p-1" role="group" aria-label="Status">
          <button
            v-for="(label, i) in ['Want to watch', 'Watched']"
            :key="label"
            :aria-pressed="saved.watched === (i === 1)"
            :class="saved.watched === (i === 1) ? 'bg-green-500 text-gray-900' : 'text-gray-400 hover:text-white'"
            class="rounded-md px-4 py-1.5 text-sm font-semibold transition"
            @click="saved.watched !== (i === 1) && store.commit('toggleWatched', saved.id)"
          >
            {{ label }}
          </button>
        </div>

        <button
          class="ml-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
          @click="removeFromLibrary"
        >
          Remove from library
        </button>

        <template v-if="saved.watched">
          <h2 class="mt-6 mb-2 text-xl font-bold">Your review</h2>
          <div class="flex gap-1 text-3xl">
            <button
              v-for="n in 5"
              :key="n"
              :aria-label="`${n} stars`"
              :class="n <= (saved.rating ?? 0) ? 'text-yellow-400' : 'text-gray-300'"
              class="transition hover:scale-125"
              @click="setReview({ rating: n })"
            >
              ★
            </button>
          </div>
          <textarea
            :value="saved.review"
            rows="4"
            placeholder="What did you think?"
            class="mt-3 w-full rounded-lg border border-white/20 p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            @input="setReview({ review: ($event.target as HTMLTextAreaElement).value })"
          />
        </template>
      </template>
    </section>

    <section v-if="movie.credits.cast.length" class="mt-8">
      <h2 class="mb-3 text-xl font-bold">Cast</h2>
      <div class="flex gap-4 overflow-x-auto pb-2">
        <div v-for="actor in movie.credits.cast.slice(0, 12)" :key="actor.credit_id" class="w-24 shrink-0 text-center">
          <img
            v-if="actor.profile_path"
            :src="posterUrl(actor.profile_path)"
            :alt="actor.name"
            class="h-24 w-24 rounded-full object-cover"
          >
          <div v-else class="h-24 w-24 rounded-full bg-gray-200" />
          <p class="mt-2 text-sm font-semibold">{{ actor.name }}</p>
          <p class="text-xs text-gray-400">{{ actor.character }}</p>
        </div>
      </div>
    </section>

    <section v-if="recommendations.length" class="mt-8">
      <h2 class="mb-3 text-xl font-bold">You might also like</h2>
      <div class="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <RouterLink
          v-for="rec in recommendations.slice(0, 12)"
          :key="rec.id"
          :to="`/movie/${rec.id}`"
          class="transition hover:scale-105"
        >
          <img
            v-if="rec.poster_path"
            :src="posterUrl(rec.poster_path)"
            :alt="rec.title"
            class="w-full rounded-lg"
          >
          <p class="mt-1 text-xs font-semibold">{{ rec.title }}</p>
        </RouterLink>
      </div>
    </section>
  </article>
</template>
